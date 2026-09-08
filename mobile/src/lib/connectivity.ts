import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

// NetInfo's web reachability check defaults to a HEAD request against '/'
// (the domain root) expecting a 200 response. This app is hosted on a
// subpath (GitHub Pages serves it at /events-app-internal/, not the domain
// root), so that request 404s. A HEAD against the CURRENT page's own URL
// would have the same problem for any client-side-only route (e.g.
// /discover): GitHub Pages serves its 404.html fallback with a genuine 404
// status so the SPA can still boot there, even though the response body is
// the normal app — but the reachability check only looks at the status
// code. Either way NetInfo concludes the internet is unreachable on a
// device with a perfectly working connection, which is what was showing up
// live as a false "you're offline" banner (and, once Firestore's own
// network state was tied to this same signal, real Firestore reads
// failing with "client is offline" too — on a real, working connection).
// Pointing the check at a real static file that always exists at this
// app's own base path (favicon.ico, produced by every export) fixes this
// without depending on the current route or the hosting root at all.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const basePath = Constants.expoConfig?.experiments?.baseUrl || '';
  NetInfo.configure({ reachabilityUrl: `${window.location.origin}${basePath}/favicon.ico` });
}

// Single source of truth for "is this device online," shared by the
// TanStack Query online manager (offlineQuery.ts) and the OfflineBanner, so
// both can't disagree.
//
// Native (iOS/Android) uses NetInfo alone — reliable there, backed by the
// OS's real connectivity APIs.
//
// Web ALSO listens to the browser's own online/offline events directly,
// verified necessary by testing: NetInfo's web implementation prefers the
// Network Information API (navigator.connection) when the browser exposes
// it, and that API's 'change' event is specified for connection-TYPE
// changes — in at least one real, reproducible case (headless Chromium via
// CDP network emulation, the same engine this app's web build runs in
// end-to-end tests under) it does not fire on a plain online/offline
// transition, silently freezing NetInfo's state. window's online/offline
// events are the primitive every browser guarantees for exactly this signal,
// so mixing them in removes the dependency on that other event actually
// firing.
//
// Both of those are still push-based, though, and push-based signals can get
// stuck: mobile Safari is known to fire a stray 'offline' event when a tab
// is backgrounded (e.g. switching to the Google sign-in screen and back),
// and if the connection never actually dropped, nothing ever fires 'online'
// again to correct it — the banner then claims "offline" indefinitely on a
// device with a perfectly good connection. So this also re-verifies for
// real via NetInfo.fetch() (a fresh read, not a cached push) whenever the
// tab regains focus, which is exactly the moment a stuck signal like that
// needs to self-correct.
export function subscribeToConnectivity(setOnline: (online: boolean) => void): () => void {
  const applyState = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  };

  const unsubscribeNetInfo = NetInfo.addEventListener(applyState);

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return unsubscribeNetInfo;
  }

  const goOnline = () => setOnline(true);
  const goOffline = () => setOnline(false);
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);

  const recheckOnFocus = () => {
    if (document.visibilityState === 'visible') {
      NetInfo.fetch().then(applyState);
    }
  };
  document.addEventListener('visibilitychange', recheckOnFocus);
  window.addEventListener('focus', recheckOnFocus);

  return () => {
    unsubscribeNetInfo();
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
    document.removeEventListener('visibilitychange', recheckOnFocus);
    window.removeEventListener('focus', recheckOnFocus);
  };
}
