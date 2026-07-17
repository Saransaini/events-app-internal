import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { LatLng } from '../types/models';

export function useDiscoverPeople(location: LatLng | null) {
  return useQuery({
    queryKey: ['users', 'discover', location?.lat, location?.lng],
    queryFn: () => api.discoverPeople({ lat: location!.lat, lng: location!.lng }),
    enabled: !!location,
    select: (data) => data.users,
  });
}
