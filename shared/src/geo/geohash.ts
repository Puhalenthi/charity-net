import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
} from 'geofire-common';

export type LatLng = { lat: number; lng: number };

export function geohashFor(location: LatLng): string {
  return geohashForLocation([location.lat, location.lng]);
}

export function geohashBoundsForRadius(
  center: LatLng,
  radiusKm: number,
): Array<[string, string]> {
  const radiusM = radiusKm * 1000;
  return geohashQueryBounds([center.lat, center.lng], radiusM);
}

export function distanceKm(a: LatLng, b: LatLng): number {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]);
}

export function withinRadius(center: LatLng, point: LatLng, radiusKm: number): boolean {
  return distanceKm(center, point) <= radiusKm;
}
