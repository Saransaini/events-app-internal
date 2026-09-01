import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToConnectivity } from './connectivity';

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
onlineManager.setEventListener(subscribeToConnectivity);
