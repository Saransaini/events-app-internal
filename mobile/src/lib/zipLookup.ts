import zipCoords from '../data/usZipCoords.json';
import type { LatLng } from '../types/models';

// US ZIP code -> [lat, lng, "City, ST"], for people who don't want to grant
// GPS location (mainly laptop/web users). A static, bundled dataset rather
// than a geocoding API call — there's no per-lookup cost and it works
// offline, at the price of only covering US ZIPs and being centroid-level
// accuracy rather than exact. Derived from the npm "zipcodes" package's
// data, dropping everything but zip/lat/lng/city/state to shrink it from
// ~5MB to ~1.8MB.
type ZipEntry = [number, number, string];
const coords = zipCoords as unknown as Record<string, ZipEntry>;

export function zipToLatLng(zip: string): (LatLng & { label: string }) | null {
  const entry = coords[zip.trim()];
  if (!entry) return null;
  return { lat: entry[0], lng: entry[1], label: entry[2] };
}
