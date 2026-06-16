import { Router } from 'express';
import type { Item } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { env } from '../config/env.js';
import { notifyItemExpired } from '../services/notifier.js';

export const jobsRouter = Router();

function authorizeJob(req: import('express').Request): boolean {
  const provided = req.headers['x-job-secret'];
  return typeof provided === 'string' && provided === env().JOB_SECRET;
}

jobsRouter.post('/expire-interest-windows', async (req, res, next) => {
  try {
    if (!authorizeJob(req)) {
      res.status(401).json({ code: 'unauthenticated', message: 'Job secret required' });
      return;
    }
    const now = Date.now();
    const snap = await COL.items()
      .where('status', '==', 'active')
      .where('interestDeadline', '<=', now)
      .limit(500)
      .get();
    let expired = 0;
    for (const doc of snap.docs) {
      const item = doc.data() as Item;
      const interestsSnap = await COL.itemInterests(item.id).limit(1).get();
      if (!interestsSnap.empty) continue;
      await doc.ref.update({ status: 'expired', updatedAt: now });
      await notifyItemExpired({ ownerUid: item.ownerUid, itemId: item.id, itemTitle: item.title });
      expired++;
    }
    res.json({ expired });
  } catch (err) {
    next(err);
  }
});
