import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Intent, LatLng } from '../types/models';

export function useDiscoverDeck(params: { dogId: string; intent: Intent; location: LatLng } | null) {
  return useQuery({
    queryKey: ['dogs', 'discover', params?.dogId, params?.intent],
    queryFn: () =>
      api.discoverDogs({
        dogId: params!.dogId,
        intent: params!.intent,
        lat: params!.location.lat,
        lng: params!.location.lng,
      }),
    enabled: !!params,
    select: (data) => data.dogs,
  });
}
