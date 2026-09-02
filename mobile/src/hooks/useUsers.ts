import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

// Batched counterpart to useUser: one query for a whole list of ids instead
// of one query per row. Used by the matches list, where mounting a separate
// useUser per row meant one Firestore round-trip per match.
export function useUsers(ids: string[]) {
  const sortedIds = [...ids].sort();
  return useQuery({
    queryKey: ['users', 'batch', sortedIds],
    queryFn: () => api.getUsers(sortedIds),
    enabled: sortedIds.length > 0,
  });
}
