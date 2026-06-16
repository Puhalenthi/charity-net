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
