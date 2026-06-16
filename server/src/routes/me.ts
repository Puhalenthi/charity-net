import { Router } from 'express';
import { COL } from '../db/collections.js';
import { requireAuth } from '../middleware/auth.js';

export const meRouter = Router();

meRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.uid;
    const userSnap = await COL.users().doc(uid).get();
    if (!userSnap.exists) {
      res.json({ user: null });
      return;
    }
    const user = userSnap.data();
    let charity: unknown = undefined;
    if (user?.charityId) {
      const cSnap = await COL.charities().doc(user.charityId).get();
      if (cSnap.exists) charity = cSnap.data();
    }
    res.json({ user, charity, claims: req.user!.claims });
  } catch (err) {
    next(err);
  }
});
