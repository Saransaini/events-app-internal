import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useMyProfile() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
}
