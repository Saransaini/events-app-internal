import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// @firebase/auth's package.json declares a "types" condition ahead of its
// "react-native" condition in its exports map, so TypeScript always resolves
// types via the generic (non-RN) auth-public.d.ts and never sees this symbol
// there — even though Metro's bundler resolution picks the real "react-native"
// JS build correctly at runtime, where this export does exist.
// @ts-expect-error - getReactNativePersistence exists at runtime (RN build) but is missing from @firebase/auth's shared type declarations
import { getReactNativePersistence } from '@firebase/auth';

// firebase/firestore's package.json exports map also lacks a "react-native"
// condition (same root cause as the auth persistence import above), so pull
// firestore from @firebase/firestore directly to get the RN-specific build
// with correct networking (long-polling) for React Native. Unlike auth, its
// public types are unified across platforms, so no suppression is needed.
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence only exists in @firebase/auth's "react-native"
// build — on web, Metro resolves the browser build instead, where it's
// undefined, so this app must only ever be used on native.
//
// On web, initializeAuth() with no config leaves the instance without a
// popupRedirectResolver at all, which is required for signInWithRedirect /
// getRedirectResult (useGoogleSignIn.ts) — without it those throw
// auth/argument-error. browserLocalPersistence is required alongside it:
// signInWithRedirect stashes the pending sign-in in storage right before
// navigating away to Google, and that storage is what survives the full
// page reload on the way back for getRedirectResult to read.
export const auth =
  Platform.OS === 'web'
    ? initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      })
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const storage = getStorage(app);
export const firestore = getFirestore(app);
