import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// Required once per app so the auth popup/tab closes itself after redirect.
WebBrowser.maybeCompleteAuthSession();

// Where Google sends the browser back to after sign-in.
//
// Left to itself, expo-auth-session derives this from window.location.ORIGIN,
// which drops any path. That is correct for a site served from a domain root
// and wrong for one served from a subpath: on GitHub Pages the app lives at
// /<repo>/, so the default sends users back to the domain root, where Wagmate
// isn't — the callback would land on an unrelated page and the sign-in would
// silently never complete. Registering that bare origin with Google would
// make the error go away without making sign-in work.
//
// So it is pinned to the app's own base path — read from
// Constants.expoConfig.experiments.baseUrl, the SAME resolved config value
// Expo Router itself uses to prefix every route and asset URL (set in
// app.config.js from WAGMATE_BASE_URL at build time). This used to be a
// second, separately-injected env var (EXPO_PUBLIC_WAGMATE_BASE_URL)
// threaded through independently; in practice that value did not reliably
// end up inlined into the bundle — confirmed by inspecting a real build,
// where it silently evaluated to empty, sending Google a redirect URI with
// no path at all and breaking sign-in on the live site with no visible
// error on this end. Reading the one value Expo Router already resolves
// correctly removes the second copy that could get out of sync.
//
// The trailing slash is kept deliberately: without it GitHub Pages issues a
// redirect to add one, and that hop can drop the URL fragment carrying the
// token.
//
// Native builds have no such ambiguity — they use a custom scheme — so this
// only applies on web.
const BASE_PATH = Constants.expoConfig?.experiments?.baseUrl || '';
const webRedirectUri =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}${BASE_PATH}/`
    : undefined;

const GOOGLE_CONFIG = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  ...(webRedirectUri ? { redirectUri: webRedirectUri } : {}),
};

export const isGoogleSignInConfigured = Boolean(
  GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.androidClientId || GOOGLE_CONFIG.webClientId
);

// TEMPORARY diagnostic export — console.log is stripped from production
// exports, so this is rendered directly in the UI instead to get a
// ground-truth read of what's actually computed on the live site. Revert
// once confirmed.
export const __DEBUG_REDIRECT_URI = webRedirectUri;
export const __DEBUG_BASE_PATH = BASE_PATH;

// Exchanges a Google ID token for a Firebase credential, then routes to
// onboarding (new user) or straight into the app (returning user) depending
// on whether their profile already has a dog. Works the same for sign-up and
// sign-in — Google doesn't distinguish the two, Firebase just creates the
// user record on first sign-in.
export function useGoogleSignIn() {
  // Google.useIdTokenAuthRequest throws synchronously (via invariantClientId)
  // if the platform's client ID is missing, which would crash the whole app
  // on mount for anyone who hasn't configured Google sign-in yet — not just
  // disable the button. isGoogleSignInConfigured is derived from build-time
  // env vars and can't change during a running app instance, so branching on
  // it here keeps hook call order consistent across all renders of a given
  // mount, even though this isn't unconditional in the static/textual sense.
  const [request, response, promptAsync] = isGoogleSignInConfigured
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
        .then(async (result) => {
          const profile = await api.upsertMe({
            displayName: result.user.displayName || '',
            email: result.user.email || '',
          });
          router.replace(profile.dog ? '/discover' : '/basic-info');
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'))
        .finally(() => setSigningIn(false));
    } else if (response.type === 'error') {
      setError(response.error?.message || 'Google sign-in failed');
    }
  }, [response]);

  return { promptAsync, ready: !!request, signingIn, error };
}
