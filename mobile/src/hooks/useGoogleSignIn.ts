import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// Required once per app so the auth popup/tab closes itself after redirect
// (native only — see useGoogleSignInNative below).
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CONFIG = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleSignInConfigured =
  Platform.OS === 'web'
    ? Boolean(WEB_CLIENT_ID)
    : Boolean(GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.androidClientId);

async function completeSignIn(result: UserCredential) {
  const profile = await api.upsertMe({
    displayName: result.user.displayName || '',
    email: result.user.email || '',
  });
  router.replace(profile.dog ? '/discover' : '/basic-info');
}

// Loads Google's own Identity Services script (once per page) — the
// official client library Google maintains for exactly this "get a token
// for a client-side SPA" case.
let gsiPromise: Promise<void> | null = null;
function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not running on web'));
  const google = (window as unknown as { google?: { accounts?: { oauth2?: unknown } } }).google;
  if (google?.accounts?.oauth2) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in script'));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

type TokenClient = { requestAccessToken: () => void };

// Web: Google Identity Services (accounts.google.com/gsi/client) instead of
// Firebase's own signInWithRedirect/signInWithPopup.
//
// Both of Firebase's own flows route through its authDomain
// (tinder4dogs-46593.firebaseapp.com) — a different origin than this app
// (saransaini.github.io) — and bridge that gap with a cross-origin iframe.
// That bridge depends on storage access modern Chrome treats as
// third-party and increasingly blocks by default, which is why
// getRedirectResult() came back empty even after a real, completed round
// trip through Google: the iframe bridge that was supposed to deliver the
// result never got through. (This is also the most likely explanation for
// why the earlier popup-based expo-auth-session attempt silently failed
// the same way — same underlying cross-origin dependency.)
//
// Google's own Identity Services library talks to its popup directly
// rather than through Firebase's authDomain, so there's no third-party
// bridge in the path. It hands back an access token, which
// GoogleAuthProvider.credential() accepts on its own (Firebase verifies it
// against Google directly) — no ID token required.
function useGoogleSignInWeb() {
  const [ready, setReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<TokenClient | null>(null);

  useEffect(() => {
    if (!WEB_CLIENT_ID) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        const google = (
          window as unknown as {
            google: {
              accounts: {
                oauth2: {
                  initTokenClient: (config: {
                    client_id: string;
                    scope: string;
                    callback: (response: { access_token?: string; error?: string }) => void;
                    error_callback?: (error: { type?: string; message?: string }) => void;
                  }) => TokenClient;
                };
              };
            };
          }
        ).google;

        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: WEB_CLIENT_ID,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.error || !response.access_token) {
              setError(response.error || 'Google sign-in failed');
              setSigningIn(false);
              return;
            }
            setSigningIn(true);
            const credential = GoogleAuthProvider.credential(null, response.access_token);
            signInWithCredential(auth, credential)
              .then(completeSignIn)
              .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'))
              .finally(() => setSigningIn(false));
          },
          error_callback: (err) => {
            setError(err?.message || err?.type || 'Google sign-in failed');
            setSigningIn(false);
          },
        });
        setReady(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load Google sign-in'));

    return () => {
      cancelled = true;
    };
  }, []);

  const promptAsync = async () => {
    setError(null);
    tokenClientRef.current?.requestAccessToken();
  };

  return { promptAsync, ready, signingIn, error };
}

function useGoogleSignInNative() {
  const configured = Boolean(GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.androidClientId);
  const [request, response, promptAsync] = configured
    ? Google.useIdTokenAuthRequest(GOOGLE_CONFIG)
    : [null, null, async () => undefined];
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        setError('Google sign-in did not return an ID token.');
        return;
      }
      setSigningIn(true);
      setError(null);
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(completeSignIn)
        .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'))
        .finally(() => setSigningIn(false));
    } else if (response.type === 'error') {
      setError(response.error?.message || 'Google sign-in failed');
    }
  }, [response]);

  return { promptAsync, ready: !!request, signingIn, error };
}

// Exchanges a Google identity for a Firebase credential, then routes to
// onboarding (new user) or straight into the app (returning user) depending
// on whether their profile already has a dog. Works the same for sign-up and
// sign-in — Google doesn't distinguish the two, Firebase just creates the
// user record on first sign-in.
export function useGoogleSignIn() {
  return Platform.OS === 'web' ? useGoogleSignInWeb() : useGoogleSignInNative();
}
