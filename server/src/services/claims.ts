import type { CustomClaims } from '@charity-net/shared';
import { auth } from '../db/admin.js';

export async function setClaims(uid: string, claims: CustomClaims): Promise<void> {
  await auth.setCustomUserClaims(uid, claims);
}

export async function getClaims(uid: string): Promise<CustomClaims | null> {
  const user = await auth.getUser(uid);
  const c = (user.customClaims ?? {}) as Partial<CustomClaims>;
  if (!c.role) return null;
  return {
    role: c.role,
    approved: Boolean(c.approved),
    charityId: c.charityId,
  };
}

export async function approveCharityClaim(ownerUid: string, charityId: string): Promise<void> {
  await setClaims(ownerUid, { role: 'charity', charityId, approved: true });
}

export async function suspendCharityClaim(ownerUid: string, charityId: string): Promise<void> {
  await setClaims(ownerUid, { role: 'charity', charityId, approved: false });
}
