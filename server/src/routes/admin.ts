import { Router } from 'express';
import type { UserRecord } from 'firebase-admin/auth';
import {
  AdminSetPasswordRequestSchema,
  ApproveCharityRequestSchema,
  RejectCharityRequestSchema,
} from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { auth } from '../db/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireRecentLogin } from '../middleware/requireRole.js';
import { HttpError } from '../middleware/errorHandler.js';
import { approveCharityClaim, suspendCharityClaim } from '../services/claims.js';
import { notifyCharityApproved, notifyCharityRejected } from '../services/notifier.js';

export const adminRouter = Router();

// Account directory for the admin panel. Auth is the source of truth for
// accounts (it also catches people who never finished signup); Firestore
// fills in profile and charity details. Recent-login gated: the panel makes
// the admin re-enter their password before this is callable.
adminRouter.get('/users', requireAuth, requireAdmin, requireRecentLogin, async (_req, res, next) => {
  try {
    const authUsers: UserRecord[] = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      authUsers.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);

    const [usersSnap, charitiesSnap] = await Promise.all([
      COL.users().get(),
      COL.charities().get(),
    ]);
    const profiles = new Map(
      usersSnap.docs.map((d) => [d.id, d.data() as { displayName?: string; charityId?: string }]),
    );
    const charityNames = new Map(
      charitiesSnap.docs.map((d) => [d.id, (d.data() as { name?: string }).name ?? null]),
    );
    const emailByUid = new Map(authUsers.map((u) => [u.uid, u.email ?? null]));

    const users = authUsers.map((u) => {
      const profile = profiles.get(u.uid);
      const claims = (u.customClaims ?? {}) as {
        role?: 'person' | 'charity' | 'admin';
        approved?: boolean;
        charityId?: string;
      };
      const charityId = claims.charityId ?? profile?.charityId ?? null;
      return {
        uid: u.uid,
        email: u.email ?? null,
        displayName: profile?.displayName ?? u.displayName ?? null,
        role: claims.role ?? 'person',
        approved: Boolean(claims.approved),
        charityId,
        charityName: charityId ? (charityNames.get(charityId) ?? null) : null,
        providers: u.providerData.map((p) => p.providerId),
        disabled: u.disabled,
        hasProfile: Boolean(profile),
        createdAt: u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : null,
        lastSignInAt: u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : null,
      };
    });

    const charities = charitiesSnap.docs.map((d) => {
      const c = d.data() as {
        name?: string;
        status?: string;
        ownerUid?: string;
        location?: { city?: string };
        createdAt?: number;
      };
      return {
        id: d.id,
        name: c.name ?? '(unnamed)',
        status: c.status ?? 'unknown',
        ownerUid: c.ownerUid ?? '',
        ownerEmail: c.ownerUid ? (emailByUid.get(c.ownerUid) ?? null) : null,
        city: c.location?.city ?? null,
        createdAt: c.createdAt ?? null,
      };
    });

    res.json({ users, charities });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/users/:uid/password',
  requireAuth,
  requireAdmin,
  requireRecentLogin,
  async (req, res, next) => {
    try {
      const { password } = AdminSetPasswordRequestSchema.parse(req.body);
      const targetUid = req.params.uid;
      await auth.updateUser(targetUid, { password });
      // Kick any existing sessions on the changed account — except the admin's
      // own, which would immediately invalidate the session doing the change.
      if (targetUid !== req.user!.uid) {
        await auth.revokeRefreshTokens(targetUid);
      }
      await COL.adminAudit().add({
        type: 'password_set',
        actorUid: req.user!.uid,
        targetUid,
        createdAt: Date.now(),
      });
      res.json({ ok: true });
    } catch (err) {
      if ((err as { code?: string }).code === 'auth/user-not-found') {
        next(new HttpError(404, 'user_not_found', 'No account with that uid'));
        return;
      }
      next(err);
    }
  },
);

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
