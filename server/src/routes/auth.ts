import { Router } from 'express';
import { CompleteSignupRequestSchema, geohashFor } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { FieldValue } from '../db/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { setClaims } from '../services/claims.js';

export const authRouter = Router();

authRouter.post('/complete-signup', requireAuth, async (req, res, next) => {
  try {
    const body = CompleteSignupRequestSchema.parse(req.body);
    const uid = req.user!.uid;
    const email = req.user!.email ?? '';

    const userRef = COL.users().doc(uid);
    const existing = await userRef.get();
    if (existing.exists) {
      throw new HttpError(409, 'already_signed_up', 'User already completed signup');
    }

    if (body.role === 'person') {
      const now = Date.now();
      const location = body.defaultLocation
        ? { ...body.defaultLocation, geohash: geohashFor(body.defaultLocation) }
        : undefined;
      // create() (not set) so a concurrent duplicate request atomically fails
      // instead of both racing past the exists-check above.
      await userRef.create({
        uid,
        role: 'person',
        displayName: body.displayName,
        email,
        defaultLocation: location ?? null,
        searchRadiusKm: 10,
        notificationPrefs: { inApp: true },
        createdAt: now,
        updatedAt: now,
      });
      await setClaims(uid, { role: 'person', approved: true });
      res.json({
        user: {
          uid,
          role: 'person' as const,
          displayName: body.displayName,
          email,
          searchRadiusKm: 10,
          notificationPrefs: { inApp: true },
          defaultLocation: location,
          createdAt: now,
          updatedAt: now,
        },
      });
      return;
    }

    // Charity branch
    const now = Date.now();
    const charityRef = COL.charities().doc();
    const charityId = charityRef.id;
    const location = { ...body.location, geohash: geohashFor(body.location) };

    await charityRef.set({
      id: charityId,
      name: body.charityName,
      description: body.description,
      websiteUrl: body.websiteUrl ?? null,
      status: 'pending',
      ownerUid: uid,
      location,
      categoriesAccepted: body.categoriesAccepted,
      verification: {
        registrationNumber: body.registrationNumber ?? null,
        documents: body.documents,
        notes: null,
      },
      createdAt: now,
      updatedAt: now,
    });
    await userRef.create({
      uid,
      role: 'charity',
      displayName: body.displayName,
      email,
      defaultLocation: location,
      searchRadiusKm: 10,
      notificationPrefs: { inApp: true },
      charityId,
      createdAt: now,
      updatedAt: now,
    });
    await setClaims(uid, { role: 'charity', charityId, approved: false });
    res.json({
      user: {
        uid,
        role: 'charity' as const,
        displayName: body.displayName,
        email,
        searchRadiusKm: 10,
        notificationPrefs: { inApp: true },
        charityId,
        defaultLocation: location,
        createdAt: now,
        updatedAt: now,
      },
      charity: {
        id: charityId,
        name: body.charityName,
        description: body.description,
        status: 'pending' as const,
        ownerUid: uid,
        location,
        categoriesAccepted: body.categoriesAccepted,
        verification: { documents: body.documents },
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (err) {
    // Firestore ALREADY_EXISTS from create() — the concurrent-duplicate case.
    if ((err as { code?: unknown }).code === 6) {
      next(new HttpError(409, 'already_signed_up', 'User already completed signup'));
      return;
    }
    next(err);
  }
});
