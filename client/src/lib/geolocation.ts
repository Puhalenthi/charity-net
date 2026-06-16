import { geohashFor, type LatLng } from '@charity-net/shared';
import { getApi } from './api';

export async function getBrowserLocation(): Promise<LatLng | null> {
  if (!('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export async function geocodeQuery(q: string) {
  const result = await getApi().geocode(q);
  return {
    lat: result.lat,
    lng: result.lng,
    geohash: geohashFor({ lat: result.lat, lng: result.lng }),
    city: result.city,
    postalCode: result.postalCode,
  };
}
