import { env } from '../config/env.js';

type GeocodeHit = {
  lat: number;
  lng: number;
  city?: string;
  postalCode?: string;
  countryCode?: string;
};

export async function geocodeAddress(query: string): Promise<GeocodeHit | null> {
  const key = env().GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    if (env().NODE_ENV !== 'production') {
      return { lat: 0, lng: 0, city: query };
    }
    return null;
  }
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', key);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
    }>;
  };
  const first = data.results?.[0];
  if (!first) return null;
  const city = first.address_components.find((c) =>
    c.types.includes('locality') || c.types.includes('postal_town'),
  )?.long_name;
  const postalCode = first.address_components.find((c) => c.types.includes('postal_code'))
    ?.long_name;
  const countryCode = first.address_components.find((c) => c.types.includes('country'))
    ?.short_name;
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    city,
    postalCode,
    countryCode,
  };
}
