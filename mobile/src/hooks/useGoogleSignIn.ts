import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// Required once per app so the auth popup/tab closes itself after redirect.
WebBrowser.maybeCompleteAuthSession();

// Native only. Web needs no client ID at all — see useGoogleSignInWeb below.
const GOOGLE_CONFIG = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

export const isGoogleSignInConfigured =
  Platform.OS === 'web' || Boolean(GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.androidClientId);

async function completeSignIn(result: UserCredential) {
  const profile = await api.upsertMe({
    displayName: result.user.displayName || '',
    email: result.user.email || '',
  });
  router.replace(profile.dog ? '/discover' : '/basic-info');
}

// Web: a same-tab redirect through Firebase's own auth handler, instead of
// expo-auth-session's popup flow.
//
// The popup flow opens a second window and depends on that window's own
// script recognizing itself as the auth popup, relaying the result back via
// window.opener, and closing itself. That handshake is fragile — if
// window.opener isn't available (popup blockers, some browsers promoting
// popups to full tabs) the popup has nothing to hand the result to, so it
// falls through to just rendering the app normally. That is exactly what was
// observed: a second window landing on /login instead of completing sign-in,
// with the Google ID token stranded in a window nothing ever reads it from.
//
// A same-tab redirect has no such handshake: the browser navigates away to
// Google and back on its own, and Firebase's SDK persists the pending
// sign-in across that navigation itself, resolved here via
// getRedirectResult() on the next load. This also needs no Google Cloud
// OAuth client of its own — Firebase runs the handshake through its own
// authDomain — so the app's Firebase project just needs the site's domain
// added under Authentication > Settings > Authorized domains in the
// Firebase console.
function useGoogleSignInWeb() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TEMPORARY — remove once the redirect round trip is confirmed working.
  // console.log is stripped from production exports, so this is the only
  // way to see what getRedirectResult() actually did on the live site.
  const [debugStatus, setDebugStatus] = useState('checking for a pending Google redirect...');

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (!result) {
          setDebugStatus('getRedirectResult() found nothing pending');
          return undefined;
        }
        setDebugStatus(`getRedirectResult() succeeded for ${result.user.email}`);
        setSigningIn(true);
        return completeSignIn(result);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setDebugStatus(`getRedirectResult() threw: ${message}`);
        setError(message);
      })
      .finally(() => setSigningIn(false));
  }, []);

  const promptAsync = async () => {
    setError(null);
    await signInWithRedirect(auth, new GoogleAuthProvider());
  };

  return { promptAsync, ready: true, signingIn, error, debugStatus };
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

  return { promptAsync, ready: !!request, signingIn, error, debugStatus: undefined as string | undefined };
}

// Exchanges a Google identity for a Firebase credential, then routes to
// onboarding (new user) or straight into the app (returning user) depending
// on whether their profile already has a dog. Works the same for sign-up and
// sign-in — Google doesn't distinguish the two, Firebase just creates the
// user record on first sign-in.
export function useGoogleSignIn() {
  return Platform.OS === 'web' ? useGoogleSignInWeb() : useGoogleSignInNative();
}
