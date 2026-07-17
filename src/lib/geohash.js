'use strict';

const ngeohash = require('ngeohash');

const GEOHASH_PRECISION = 8;
const EARTH_RADIUS_KM = 6371;

function encode(lat, lng) {
    return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

// returns [{ start, end }] geohash string ranges covering a bounding box
// around (lat, lng) out to radiusKm. Used for a Firestore range query as a
// cheap prefilter; exact distance is still checked with haversineDistanceKm.
function bboxRanges(lat, lng, radiusKm) {
    const bounds = ngeohash.bounds ? null : null; // ngeohash has no bbox helper; derive manually below
    const latDelta = radiusKm / 110.574; // km per degree latitude
    const lngDelta = radiusKm / (111.320 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const hashes = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, GEOHASH_PRECISION);

    // collapse into contiguous prefix ranges is unnecessary for v1 scale;
    // callers can query each hash prefix range individually via >= / < on
    // the shorter common prefix. For simplicity we return the full list of
    // covering hash cells so callers can do an `in` query in batches of 10,
    // or fall back to a single prefix range using the shortest common prefix.
    return hashes;
}

function haversineDistanceKm(a, b) {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return EARTH_RADIUS_KM * c;
}

module.exports = { encode, bboxRanges, haversineDistanceKm, GEOHASH_PRECISION };
