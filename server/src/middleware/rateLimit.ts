import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

function uidKey(req: Request): string {
  return req.user?.uid ?? req.ip ?? 'anon';
}

export const itemCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: uidKey,
  message: { code: 'rate_limited', message: 'Daily item-create limit reached' },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: uidKey,
  message: { code: 'rate_limited', message: 'Too many requests' },
});

export const interestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: uidKey,
});
