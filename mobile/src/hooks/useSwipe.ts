import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Intent } from '../types/models';

export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { swiperDogId: string; targetDogId: string; intent: Intent; direction: 'like' | 'pass' }) =>
      api.swipe(body),
    onSuccess: (result) => {
      if (result.matched) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });
}
