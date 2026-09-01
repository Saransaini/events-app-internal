import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

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
export function subscribeToConnectivity(setOnline: (online: boolean) => void): () => void {
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  });

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return unsubscribeNetInfo;
  }

  const goOnline = () => setOnline(true);
  const goOffline = () => setOnline(false);
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);

  return () => {
    unsubscribeNetInfo();
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
  };
}
