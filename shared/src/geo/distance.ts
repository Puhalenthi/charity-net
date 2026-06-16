import type { LatLng } from './geohash.js';

const EARTH_RADIUS_M = 6378137;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function jitterLocation(point: LatLng, jitterMeters: number, seed?: string): LatLng {
  const rng = seed ? mulberry32(hashString(seed)) : Math.random;
  const angle = rng() * 2 * Math.PI;
  const distance = jitterMeters * Math.sqrt(rng());
  const deltaLat = (distance * Math.cos(angle)) / EARTH_RADIUS_M;
  const deltaLng =
    (distance * Math.sin(angle)) /
    (EARTH_RADIUS_M * Math.cos(toRad(point.lat)));
  return {
    lat: point.lat + toDeg(deltaLat),
    lng: point.lng + toDeg(deltaLng),
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
