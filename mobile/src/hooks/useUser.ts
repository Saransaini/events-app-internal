import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useUser(uid: string | undefined) {
  return useQuery({
    queryKey: ['users', uid],
    queryFn: () => api.getUser(uid!),
    enabled: !!uid,
  });
}
