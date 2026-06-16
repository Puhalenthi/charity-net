import { Router } from 'express';
import {
  CreateItemRequestSchema,
  ExpressInterestRequestSchema,
  FinalizeRecipientRequestSchema,
  INTEREST_WINDOW_MS,
  geohashFor,
} from '@charity-net/shared';
import type { Item } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { FieldValue, db } from '../db/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprovedCharity, requireRole } from '../middleware/requireRole.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  interestLimiter,
  itemCreateLimiter,
} from '../middleware/rateLimit.js';
import { scanWithRetry } from '../services/openaiVision.js';
import { matchWishlistsForItem } from '../services/wishlistMatcher.js';
import {
  notifyItemRemoved,
  notifyNotSelected,
  notifyOwnerNewInterest,
  notifySelected,
} from '../services/notifier.js';

export const itemsRouter = Router();

itemsRouter.post(
  '/',
  requireAuth,
  requireRole('person'),
  itemCreateLimiter,
  async (req, res, next) => {
    try {
      const body = CreateItemRequestSchema.parse(req.body);
      const uid = req.user!.uid;
      const now = Date.now();
      const itemRef = COL.items().doc();
      const itemId = itemRef.id;
      const location = { ...body.location, geohash: geohashFor(body.location) };
      const baseItem: Item = {
        id: itemId,
        ownerUid: uid,
        title: body.title,
        description: body.description,
        images: body.images,
        location,
        aiStatus: 'pending',
        aiTags: [],
        aiKeywords: [],
        aiSafety: { nsfw: false, weapon: false, hazardous: false, pii: false },
        status: 'active',
        interestDeadline: now + INTEREST_WINDOW_MS,
        interestCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await itemRef.set(baseItem);
      res.json({ item: baseItem });

      // Fire-and-forget AI scan + wishlist matching
      runAiPipeline(itemRef.path, baseItem).catch((err) =>
        console.error('[items] ai pipeline failed', err),
      );
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.post('/:id/scan', requireAuth, async (req, res, next) => {
  try {
    const itemRef = COL.items().doc(req.params.id);
    const snap = await itemRef.get();
    if (!snap.exists) throw new HttpError(404, 'item_not_found', 'Item not found');
    const item = snap.data() as Item;
    if (req.user!.claims.role !== 'admin' && item.ownerUid !== req.user!.uid) {
      throw new HttpError(403, 'forbidden', 'Not allowed to rescan');
    }
    runAiPipeline(itemRef.path, item).catch((err) =>
      console.error('[items] manual rescan failed', err),
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

itemsRouter.post(
  '/:id/finalize-recipient',
  requireAuth,
  requireRole('person'),
  async (req, res, next) => {
    try {
      const { charityId } = FinalizeRecipientRequestSchema.parse(req.body);
      const itemId = req.params.id;
      const uid = req.user!.uid;
      const itemRef = COL.items().doc(itemId);
      const interestsCol = COL.itemInterests(itemId);

      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(itemRef);
        if (!snap.exists) throw new HttpError(404, 'item_not_found', 'Item not found');
        const item = snap.data() as Item;
        if (item.ownerUid !== uid) {
          throw new HttpError(403, 'forbidden', 'Only the poster may select');
        }
        if (item.status !== 'active' && item.status !== 'reserved') {
          throw new HttpError(409, 'item_not_active', 'Item not in an active state');
        }
        const winningSnap = await tx.get(interestsCol.doc(charityId));
        if (!winningSnap.exists) {
          throw new HttpError(404, 'interest_not_found', 'That charity has not expressed interest');
        }
        const allInterests = await tx.get(interestsCol);
        const charityOwnerUid = (winningSnap.data() as { charityOwnerUid?: string }).charityOwnerUid;
        tx.update(itemRef, {
          status: 'given',
          selectedCharityId: charityId,
          selectedAt: Date.now(),
          updatedAt: Date.now(),
        });
        const others: Array<{ ownerUid: string; charityId: string }> = [];
        allInterests.docs.forEach((d) => {
          const data = d.data() as { charityOwnerUid?: string; charityId: string };
          if (d.id !== charityId && data.charityOwnerUid) {
            others.push({ ownerUid: data.charityOwnerUid, charityId: data.charityId });
          }
        });
        return { item, charityOwnerUid, others };
      });

      if (result.charityOwnerUid) {
        await notifySelected({
          charityOwnerUid: result.charityOwnerUid,
          itemId,
          itemTitle: result.item.title,
        });
      }
      for (const other of result.others) {
        await notifyNotSelected({
          charityOwnerUid: other.ownerUid,
          itemId,
          itemTitle: result.item.title,
        });
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.post(
  '/:id/interests',
  requireAuth,
  requireApprovedCharity,
  interestLimiter,
  async (req, res, next) => {
    try {
      const body = ExpressInterestRequestSchema.parse(req.body);
      const itemId = req.params.id;
      const charityId = req.user!.claims.charityId;
      if (!charityId) throw new HttpError(400, 'no_charity', 'No charity associated');

      const itemRef = COL.items().doc(itemId);
      const interestRef = COL.itemInterests(itemId).doc(charityId);

      await db.runTransaction(async (tx) => {
        const itemSnap = await tx.get(itemRef);
        if (!itemSnap.exists) throw new HttpError(404, 'item_not_found', 'Item not found');
        const item = itemSnap.data() as Item;
        if (item.status !== 'active') {
          throw new HttpError(409, 'item_not_active', 'Item not accepting interest');
        }
        if (Date.now() > item.interestDeadline) {
          throw new HttpError(409, 'window_closed', 'Interest window has closed');
        }
        const charitySnap = await tx.get(COL.charities().doc(charityId));
        if (!charitySnap.exists) throw new HttpError(404, 'charity_not_found', 'Charity not found');
        const charity = charitySnap.data() as { name: string; logoUrl?: string; status: string };
        if (charity.status !== 'approved') {
          throw new HttpError(403, 'charity_not_approved', 'Charity not approved');
        }
        const existing = await tx.get(interestRef);
        if (existing.exists) {
          throw new HttpError(409, 'already_interested', 'You already expressed interest');
        }
        tx.set(interestRef, {
          charityId,
          charityName: charity.name,
          charityLogoUrl: charity.logoUrl ?? null,
          charityOwnerUid: req.user!.uid,
          ownerUid: item.ownerUid,
          message: body.message ?? null,
          createdAt: Date.now(),
        });
        tx.update(itemRef, {
          interestCount: FieldValue.increment(1),
          updatedAt: Date.now(),
        });
      });

      // Notify the poster outside the transaction
      const itemSnap = await itemRef.get();
      const item = itemSnap.data() as Item;
      const charitySnap = await COL.charities().doc(charityId).get();
      await notifyOwnerNewInterest({
        ownerUid: item.ownerUid,
        charityName: (charitySnap.data() as { name: string }).name,
        itemId,
        itemTitle: item.title,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

itemsRouter.delete(
  '/:id/interests/:charityId',
  requireAuth,
  requireApprovedCharity,
  async (req, res, next) => {
    try {
      const { id: itemId, charityId } = req.params;
      if (req.user!.claims.charityId !== charityId) {
        throw new HttpError(403, 'forbidden', 'Cannot withdraw another charity');
      }
      const itemRef = COL.items().doc(itemId);
      const interestRef = COL.itemInterests(itemId).doc(charityId);
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(interestRef);
        if (!existing.exists) return;
        tx.delete(interestRef);
        tx.update(itemRef, {
          interestCount: FieldValue.increment(-1),
          updatedAt: Date.now(),
        });
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

async function runAiPipeline(itemPath: string, item: Item): Promise<void> {
  const imageUrls = item.images.map((i) => i.url);
  const result = await scanWithRetry(imageUrls);
  const itemRef = db.doc(itemPath);

  const isFlagged = result.safety.weapon || result.safety.nsfw || result.safety.hazardous;
  if (isFlagged) {
    await itemRef.update({
      aiStatus: 'flagged',
      aiCategory: result.category ?? null,
      aiCondition: result.condition ?? null,
      aiTags: result.tags,
      aiKeywords: result.keywords,
      aiSafety: result.safety,
      aiRaw: result.raw ?? null,
      status: 'removed',
      updatedAt: Date.now(),
    });
    await notifyItemRemoved({
      ownerUid: item.ownerUid,
      itemId: item.id,
      itemTitle: item.title,
      reason: 'Image moderation flagged this item',
    });
    return;
  }

  await itemRef.update({
    aiStatus: 'done',
    aiCategory: result.category ?? null,
    aiCondition: result.condition ?? null,
    aiTags: result.tags,
    aiKeywords: result.keywords,
    aiSafety: result.safety,
    aiRaw: result.raw ?? null,
    updatedAt: Date.now(),
  });

  const fresh = (await itemRef.get()).data() as Item;
  await matchWishlistsForItem(fresh);
}
