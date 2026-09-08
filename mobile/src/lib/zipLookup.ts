import zipCoords from '../data/usZipCoords.json';
import type { LatLng } from '../types/models';

// US ZIP code -> [lat, lng] centroid, for people who don't want to grant
// GPS location (mainly laptop/web users). A static, bundled dataset rather
// than a geocoding API call — there's no per-lookup cost and it works
// offline, at the price of only covering US ZIPs and being centroid-level
// accuracy rather than exact. Derived from the npm "zipcodes" package's
// data, keeping only zip/lat/lng (city/state/etc dropped) to shrink it from
// ~5MB to ~1MB.
const coords: Record<string, number[]> = zipCoords;

export function zipToLatLng(zip: string): LatLng | null {
  const entry = coords[zip.trim()];
  if (!entry) return null;
  return { lat: entry[0], lng: entry[1] };
}
