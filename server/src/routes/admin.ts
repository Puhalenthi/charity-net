import { Router } from 'express';
import {
  ApproveCharityRequestSchema,
  RejectCharityRequestSchema,
} from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { HttpError } from '../middleware/errorHandler.js';
import { approveCharityClaim, suspendCharityClaim } from '../services/claims.js';
import { notifyCharityApproved, notifyCharityRejected } from '../services/notifier.js';

export const adminRouter = Router();

adminRouter.get('/charities/pending', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const snap = await COL.charities().where('status', '==', 'pending').orderBy('createdAt').get();
    res.json({ charities: snap.docs.map((d) => d.data()) });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/charities/:id/approve',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = ApproveCharityRequestSchema.parse(req.body ?? {});
      const charityId = req.params.id;
      const charityRef = COL.charities().doc(charityId);
      const snap = await charityRef.get();
      if (!snap.exists) throw new HttpError(404, 'charity_not_found', 'Charity not found');
      const charity = snap.data() as { ownerUid: string; name: string };
      const now = Date.now();
      await charityRef.update({
        status: 'approved',
        approvedAt: now,
        approvedByUid: req.user!.uid,
        ...(body.notes ? { 'verification.notes': body.notes } : {}),
        updatedAt: now,
      });
      await approveCharityClaim(charity.ownerUid, charityId);
      await COL.adminAudit().add({
        type: 'charity_approve',
        actorUid: req.user!.uid,
        targetCharityId: charityId,
        notes: body.notes ?? null,
        createdAt: now,
      });
      await notifyCharityApproved(charity.ownerUid);
      res.json({ charity: (await charityRef.get()).data() });
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.post(
  '/charities/:id/reject',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = RejectCharityRequestSchema.parse(req.body);
      const charityId = req.params.id;
      const charityRef = COL.charities().doc(charityId);
      const snap = await charityRef.get();
      if (!snap.exists) throw new HttpError(404, 'charity_not_found', 'Charity not found');
      const charity = snap.data() as { ownerUid: string };
      const now = Date.now();
      await charityRef.update({
        status: 'rejected',
        rejectionReason: body.reason,
        updatedAt: now,
      });
      await suspendCharityClaim(charity.ownerUid, charityId);
      await COL.adminAudit().add({
        type: 'charity_reject',
        actorUid: req.user!.uid,
        targetCharityId: charityId,
        reason: body.reason,
        createdAt: now,
      });
      await notifyCharityRejected(charity.ownerUid, body.reason);
      res.json({ charity: (await charityRef.get()).data() });
    } catch (err) {
      next(err);
    }
  },
);
