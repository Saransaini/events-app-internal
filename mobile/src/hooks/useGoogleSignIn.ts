import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// Required once per app so the auth popup/tab closes itself after redirect.
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CONFIG = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const isGoogleSignInConfigured = Boolean(
  GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.androidClientId || GOOGLE_CONFIG.webClientId
);

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
