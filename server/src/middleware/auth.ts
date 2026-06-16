import type { NextFunction, Request, Response } from 'express';
import { auth } from '../db/admin.js';
import type { CustomClaims } from '@charity-net/shared';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      uid: string;
      email?: string;
      claims: CustomClaims;
    };
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = await auth.verifyIdToken(token);
    const role = (decoded['role'] as CustomClaims['role'] | undefined) ?? 'person';
    const approved = Boolean(decoded['approved'] ?? false);
    const charityId = decoded['charityId'] as string | undefined;
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      claims: { role, approved, charityId },
    };
    next();
  } catch (err) {
    // Invalid token — proceed unauthenticated; downstream gates will 401.
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ code: 'unauthenticated', message: 'Authentication required' });
    return;
  }
  next();
}
