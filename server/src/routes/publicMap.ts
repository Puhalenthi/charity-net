import { Router } from 'express';
import {
  PUBLIC_MAP_JITTER_METERS,
  jitterLocation,
  type PublicMapCharity,
  type PublicMapItem,
} from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { env } from '../config/env.js';

// Signed-out map. Served from here rather than by opening Firestore rules so
// the public never sees raw donor coordinates, owner uids or addresses: only
// a whitelisted projection with item positions fuzzed server-side.
export const publicMapRouter = Router();

const MAX_ITEMS = 500;
const MAX_CHARITIES = 500;

type Loc = { lat: number; lng: number; city?: string };

publicMapRouter.get('/map', async (_req, res, next) => {
  try {
    const [charitySnap, itemSnap] = await Promise.all([
      COL.charities().where('status', '==', 'approved').limit(MAX_CHARITIES).get(),
      COL.items().where('status', '==', 'active').limit(MAX_ITEMS).get(),
    ]);

    const charities: PublicMapCharity[] = charitySnap.docs.flatMap((d) => {
      const c = d.data() as {
        name?: string;
        description?: string;
        categoriesAccepted?: string[];
        logoUrl?: string;
        location?: Loc;
      };
      if (!c.location) return [];
      return [
        {
          id: d.id,
          name: c.name ?? 'Charity',
          description: c.description ?? '',
          categoriesAccepted: c.categoriesAccepted ?? [],
          logoUrl: c.logoUrl ?? null,
          city: c.location.city ?? null,
          lat: c.location.lat,
          lng: c.location.lng,
        },
      ];
    });

    // The jitter seed mixes in a server secret: seeding with the public item
    // id alone would let anyone recompute the offset and undo it.
    const salt = env().JOB_SECRET;
    const items: PublicMapItem[] = itemSnap.docs
      .map((d) => ({ id: d.id, data: d.data() as {
        title?: string;
        aiCategory?: string;
        images?: Array<{ url?: string }>;
        location?: Loc;
        createdAt?: number;
      } }))
      .filter(({ data }) => data.location)
      .sort((a, b) => (b.data.createdAt ?? 0) - (a.data.createdAt ?? 0))
      .map(({ id, data }) => {
        const pos = jitterLocation(data.location!, PUBLIC_MAP_JITTER_METERS, `${salt}:${id}`);
        return {
          id,
          title: data.title ?? 'Item',
          category: data.aiCategory ?? null,
          photoUrl: data.images?.[0]?.url ?? null,
          city: data.location!.city ?? null,
          lat: pos.lat,
          lng: pos.lng,
        };
      });

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ charities, items });
  } catch (err) {
    next(err);
  }
});
