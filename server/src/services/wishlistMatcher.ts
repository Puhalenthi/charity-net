import { geohashBoundsForRadius, distanceKm } from '@charity-net/shared';
import type { Item } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { notifyCharityWishlistMatch } from './notifier.js';

type CharityCandidate = {
  id: string;
  ownerUid: string;
  name: string;
  location: { lat: number; lng: number; geohash: string };
  searchRadiusKm: number;
};

export async function matchWishlistsForItem(item: Item): Promise<{ matched: number }> {
  if (!item.aiTags.length && !item.aiCategory) return { matched: 0 };
  const itemLatLng = { lat: item.location.lat, lng: item.location.lng };

  const candidates = await findApprovedNearbyCharities(item);
  let matched = 0;

  for (const charity of candidates) {
    if (distanceKm(itemLatLng, charity.location) > charity.searchRadiusKm) continue;

    const wishlistSnap = await COL.charityWishlist(charity.id)
      .where('active', '==', true)
      .get();
    if (wishlistSnap.empty) continue;

    let bestScore = 0;
    let bestNotes: string | undefined;
    for (const doc of wishlistSnap.docs) {
      const data = doc.data() as {
        tags?: string[];
        categories?: string[];
        notes?: string;
      };
      const wishTags = new Set((data.tags ?? []).map((t) => t.toLowerCase()));
      const overlap = item.aiTags.filter((t) => wishTags.has(t.toLowerCase())).length;
      const catBonus =
        item.aiCategory && data.categories?.includes(item.aiCategory) ? 1 : 0;
      const score = overlap + catBonus;
      if (score > bestScore) {
        bestScore = score;
        bestNotes = data.notes;
      }
    }

    if (bestScore > 0) {
      await notifyCharityWishlistMatch({
        charityOwnerUid: charity.ownerUid,
        charityName: charity.name,
        item,
        score: bestScore,
        wishlistNotes: bestNotes,
      });
      matched++;
    }
  }

  return { matched };
}

async function findApprovedNearbyCharities(item: Item): Promise<CharityCandidate[]> {
  const MAX_RADIUS_KM = 50;
  const bounds = geohashBoundsForRadius(
    { lat: item.location.lat, lng: item.location.lng },
    MAX_RADIUS_KM,
  );
  const seen = new Map<string, CharityCandidate>();
  for (const [start, end] of bounds) {
    let q = COL.charities()
      .where('status', '==', 'approved')
      .where('location.geohash', '>=', start)
      .where('location.geohash', '<=', end);
    if (item.aiCategory) {
      q = q.where('categoriesAccepted', 'array-contains', item.aiCategory);
    }
    const snap = await q.get();
    for (const doc of snap.docs) {
      if (seen.has(doc.id)) continue;
      const data = doc.data() as {
        ownerUid: string;
        name: string;
        location: { lat: number; lng: number; geohash: string };
      };
      const ownerSnap = await COL.users().doc(data.ownerUid).get();
      const radius =
        (ownerSnap.exists ? (ownerSnap.data() as { searchRadiusKm?: number }).searchRadiusKm : null) ??
        10;
      seen.set(doc.id, {
        id: doc.id,
        ownerUid: data.ownerUid,
        name: data.name,
        location: data.location,
        searchRadiusKm: radius,
      });
    }
  }
  return Array.from(seen.values());
}
