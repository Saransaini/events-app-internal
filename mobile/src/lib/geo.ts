import type { LatLng } from '../types/models';

const EARTH_RADIUS_KM = 6371;

// Public profiles store location rounded to 2 decimal places (~1.1km of
// latitude) rather than exact coordinates. Distance readouts stay useful at
// the "3 km away" granularity a dating app actually shows, while the stored
// value is far too coarse to point at someone's home — including for anyone
// reading the documents directly rather than through the app.
const COARSE_DECIMALS = 2;

export function coarsenLocation({ lat, lng }: LatLng): LatLng {
  const factor = 10 ** COARSE_DECIMALS;
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
