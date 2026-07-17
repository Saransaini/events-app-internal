import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useMatches() {
  return useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => api.getMyMatches(),
    select: (data) => data.matches,
  });
}
