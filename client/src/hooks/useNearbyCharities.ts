import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  distanceKm,
  geohashBoundsForRadius,
  type Charity,
  type LatLng,
} from '@charity-net/shared';
import { db } from '@/lib/firebase';

export function useNearbyCharities(center: LatLng | null, radiusKm: number) {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!center) {
      setCharities([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const bounds = geohashBoundsForRadius(center, radiusKm);
      const col = collection(db, 'charities');
      const matched = new Map<string, Charity>();
      for (const [start, end] of bounds) {
        const q = query(
          col,
          where('status', '==', 'approved'),
          where('location.geohash', '>=', start),
          where('location.geohash', '<=', end),
        );
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const c = doc.data() as Charity;
          if (distanceKm(center, { lat: c.location.lat, lng: c.location.lng }) <= radiusKm) {
            matched.set(doc.id, c);
          }
        });
      }
      if (!cancelled) {
        setCharities(Array.from(matched.values()));
        setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lng, radiusKm]);

  return { charities, loading };
}
