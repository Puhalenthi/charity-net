import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { geocodeAddress } from '../services/geocode.js';

export const geocodeRouter = Router();

geocodeRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ code: 'invalid_input', message: 'q is required' });
      return;
    }
    const hit = await geocodeAddress(q);
    if (!hit) {
      res.status(404).json({ code: 'not_found', message: 'No match' });
      return;
    }
    res.json(hit);
  } catch (err) {
    next(err);
  }
});
