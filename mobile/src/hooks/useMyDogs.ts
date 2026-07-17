import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useMyDogs() {
  return useQuery({
    queryKey: ['dogs', 'mine'],
    queryFn: () => api.getMyDogs(),
    select: (data) => data.dogs,
  });
}
