import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  distanceKm,
  geohashBoundsForRadius,
  type Item,
  type LatLng,
} from '@charity-net/shared';
import { db } from '@/lib/firebase';

export function useNearbyItems(center: LatLng | null, radiusKm: number) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!center) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const bounds = geohashBoundsForRadius(center, radiusKm);
      const itemsCol = collection(db, 'items');
      const matched = new Map<string, Item>();
      for (const [start, end] of bounds) {
        const q = query(
          itemsCol,
          where('status', '==', 'active'),
          where('location.geohash', '>=', start),
          where('location.geohash', '<=', end),
        );
        const snap = await getDocs(q);
        snap.forEach((doc) => {
          const it = doc.data() as Item;
          if (distanceKm(center, { lat: it.location.lat, lng: it.location.lng }) <= radiusKm) {
            matched.set(doc.id, it);
          }
        });
      }
      if (!cancelled) {
        setItems(Array.from(matched.values()).sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lng, radiusKm]);

  return { items, loading };
}
