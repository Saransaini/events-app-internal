import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enableNetwork, disableNetwork } from '@firebase/firestore';
import { subscribeToConnectivity } from './connectivity';
import { firestore } from './firebase';

// Every server read in this app (profile, discover feed, matches list, a
// match's other-person profile) goes through React Query, so persisting its
// cache to disk is what makes those screens work on a cold start with no
// signal — showing the last data fetched rather than a blank/error screen.
// This is deliberately the whole offline strategy for reads: no separate
// hand-rolled cache, reusing the data layer the app already has.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data must outlive the default 5-minute gcTime, or it would be
      // evicted from memory (and never written back to disk) long before
      // anyone opens the app offline. 7 days is "long enough to still be
      // useful," not a claim that the data stays accurate that whole time.
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'WAGMATE_QUERY_CACHE',
});

// React Query's default online detection is window.addEventListener('online'
// / 'offline'), which does not exist on native and would leave every device
// permanently reported "online." See connectivity.ts for the real signal
// used instead, and why it isn't just NetInfo alone.
//
// Firestore's web SDK does its own, independent online/offline tracking —
// it listens to the same raw browser signals connectivity.ts already works
// around (including the stray-event problem), so a spurious 'offline' can
// leave Firestore internally convinced it's offline (getDoc/getDocs then
// reject with "Failed to get document because the client is offline")
// even after connectivity.ts's own recheck has already cleared our banner.
// Explicitly driving enableNetwork/disableNetwork off the same signal this
// app already trusts keeps Firestore's belief from silently diverging from
// what the rest of the app (and the user) can see.
onlineManager.setEventListener((setOnline) =>
  subscribeToConnectivity((online) => {
    setOnline(online);
    (online ? enableNetwork(firestore) : disableNetwork(firestore)).catch(() => {});
  })
);
