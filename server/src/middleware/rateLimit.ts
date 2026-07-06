import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { MAX_ITEMS_PER_DAY_PER_USER } from '@charity-net/shared';

function uidKey(req: Request): string {
  return req.user?.uid ?? req.ip ?? 'anon';
}

export const itemCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: MAX_ITEMS_PER_DAY_PER_USER,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: uidKey,
  message: { code: 'rate_limited', message: 'Daily item-create limit reached' },
});

// Each scan is a paid OpenAI vision call, so cap manual rescans tightly.
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: uidKey,
  message: { code: 'rate_limited', message: 'Too many rescans — try again later' },
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
