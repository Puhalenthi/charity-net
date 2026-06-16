import { Router } from 'express';
import { UpdateWishlistRequestSchema, normalizeTag } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprovedCharity } from '../middleware/requireRole.js';
import { HttpError } from '../middleware/errorHandler.js';

export const wishlistsRouter = Router();

wishlistsRouter.put(
  '/:charityId/wishlist',
  requireAuth,
  requireApprovedCharity,
  async (req, res, next) => {
    try {
      const body = UpdateWishlistRequestSchema.parse(req.body);
      const charityId = req.params.charityId;
      if (req.user!.claims.charityId !== charityId) {
        throw new HttpError(403, 'forbidden', 'Cannot edit another charity');
      }
      const col = COL.charityWishlist(charityId);
      const existing = await col.get();
      const batch = COL.charities().firestore.batch();
      existing.docs.forEach((d) => batch.delete(d.ref));
      const now = Date.now();
      for (const item of body.items) {
        const ref = col.doc();
        batch.set(ref, {
          id: ref.id,
          tags: item.tags.map(normalizeTag),
          keywords: item.keywords.map((k) => k.trim().toLowerCase()),
          categories: item.categories,
          notes: item.notes ?? null,
          active: item.active,
          createdAt: now,
          updatedAt: now,
        });
      }
      await batch.commit();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
