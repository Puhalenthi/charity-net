/**
 * Admin accounts sign in with a short username instead of an email. Firebase
 * Auth's email/password provider needs an email, so a username maps onto a
 * synthetic address under a subdomain we own and never hand out — it can't
 * collide with a real person's mailbox, and renaming is just an email change.
 */
export const ADMIN_LOGIN_DOMAIN = 'login.storageauctionconnect.org';

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

/** The default admin credentials provisioned by scripts/bootstrapAdmin.ts. */
export const DEFAULT_ADMIN_USERNAME = 'admin';

/** "admin" -> "admin@login.…"; anything containing "@" passes through. */
export function toLoginEmail(identifier: string): string {
  const id = identifier.trim();
  return id.includes('@') ? id : `${id.toLowerCase()}@${ADMIN_LOGIN_DOMAIN}`;
}

export function isUsernameEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${ADMIN_LOGIN_DOMAIN}`));
}

/** The username behind a synthetic email, or null for a real address. */
export function usernameFromEmail(email: string | null | undefined): string | null {
  if (!email || !isUsernameEmail(email)) return null;
  return email.slice(0, email.indexOf('@'));
}
