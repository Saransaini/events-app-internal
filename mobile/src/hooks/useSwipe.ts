import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { targetUid: string; direction: 'like' | 'pass' }) => api.swipe(body),
    onSuccess: (result) => {
      if (result.matched) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });
}
