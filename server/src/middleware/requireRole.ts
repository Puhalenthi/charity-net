import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@charity-net/shared';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 'unauthenticated', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.claims.role)) {
      res.status(403).json({ code: 'forbidden_role', message: 'Insufficient role' });
      return;
    }
    next();
  };
}

export function requireApprovedCharity(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ code: 'unauthenticated', message: 'Authentication required' });
    return;
  }
  const { claims } = req.user;
  if (claims.role !== 'charity') {
    res.status(403).json({ code: 'forbidden_role', message: 'Charity role required' });
    return;
  }
  if (!claims.approved) {
    res.status(403).json({ code: 'charity_pending', message: 'Charity not yet approved' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.claims.role !== 'admin') {
    res.status(403).json({ code: 'forbidden_role', message: 'Admin role required' });
    return;
  }
  next();
}

const RECENT_LOGIN_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Gate for credential-sensitive endpoints: the caller must have re-entered
 * their password within the last few minutes. Client-side reauthentication
 * (reauthenticateWithCredential) mints a token with a fresh auth_time, which
 * is what we check — a long-lived session alone is not enough.
 */
export function requireRecentLogin(req: Request, res: Response, next: NextFunction): void {
  const authTime = req.user?.authTime ?? 0;
  if (Date.now() - authTime * 1000 > RECENT_LOGIN_MAX_AGE_MS) {
    res.status(403).json({
      code: 'recent_login_required',
      message: 'Confirm your password again to continue',
    });
    return;
  }
  next();
}
