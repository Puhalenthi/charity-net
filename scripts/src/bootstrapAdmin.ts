/**
 * Makes the username-login account `admin` the one and only admin.
 *
 *   FIREBASE_PROJECT_ID=charity-net-c4474 pnpm --filter @charity-net/scripts bootstrap-admin
 *
 * 1. Creates (or resets) `admin@login.storageauctionconnect.org` with the
 *    default password, sets the admin claim and writes its `users/` profile.
 * 2. Demotes every OTHER admin: clears their claims, flips their profile role
 *    to `person` and revokes their sessions.
 * 3. Seeds `siteContent/published` with the built-in defaults if nothing has
 *    been published yet.
 *
 * Re-running is safe. Pass `--keep-password` to leave an existing admin's
 * password alone (e.g. after the default has already been changed).
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_ADMIN_USERNAME, DEFAULT_SITE_CONTENT, toLoginEmail } from '@charity-net/shared';

const DEFAULT_PASSWORD = 'password';

if (!getApps().length) {
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: applicationDefault() });
}
const auth = getAuth();
const db = getFirestore();

async function main() {
  const keepPassword = process.argv.includes('--keep-password');
  const email = toLoginEmail(DEFAULT_ADMIN_USERNAME);
  const now = Date.now();

  let admin: UserRecord;
  let resetPassword = true;
  try {
    admin = await auth.getUserByEmail(email);
    if (keepPassword) resetPassword = false;
    else await auth.updateUser(admin.uid, { password: DEFAULT_PASSWORD, disabled: false });
  } catch {
    admin = await auth.createUser({ email, password: DEFAULT_PASSWORD, displayName: 'Admin' });
  }
  await auth.setCustomUserClaims(admin.uid, { role: 'admin', approved: true });
  // The profile doc is required: without it /api/me returns no user and
  // sign-in looks like it bounces back to the landing page.
  const profileRef = db.collection('users').doc(admin.uid);
  const existing = await profileRef.get();
  await profileRef.set(
    {
      uid: admin.uid,
      role: 'admin',
      displayName: existing.get('displayName') ?? 'Admin',
      email,
      searchRadiusKm: existing.get('searchRadiusKm') ?? 10,
      notificationPrefs: existing.get('notificationPrefs') ?? { inApp: true },
      ...(resetPassword ? { defaultPassword: true } : {}),
      createdAt: existing.get('createdAt') ?? now,
      updatedAt: now,
    },
    { merge: true },
  );
  console.log(`Admin ready: username "${DEFAULT_ADMIN_USERNAME}" (${email}, uid=${admin.uid})`);
  if (resetPassword) console.log(`  password reset to the default: "${DEFAULT_PASSWORD}"`);

  // Demote every other admin.
  let pageToken: string | undefined;
  let demoted = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.uid === admin.uid || u.customClaims?.['role'] !== 'admin') continue;
      await auth.setCustomUserClaims(u.uid, { role: 'person', approved: true });
      await auth.revokeRefreshTokens(u.uid);
      const ref = db.collection('users').doc(u.uid);
      if ((await ref.get()).exists) await ref.set({ role: 'person', updatedAt: now }, { merge: true });
      await db.collection('adminAudit').add({
        type: 'admin_demoted',
        actorUid: 'script:bootstrapAdmin',
        targetUid: u.uid,
        createdAt: now,
      });
      console.log(`  demoted former admin ${u.email ?? u.uid}`);
      demoted++;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  if (!demoted) console.log('  no other admins found');

  const published = db.collection('siteContent').doc('published');
  if (!(await published.get()).exists) {
    await published.set({ ...DEFAULT_SITE_CONTENT, updatedAt: now, updatedBy: admin.uid });
    await published.collection('versions').add({
      content: DEFAULT_SITE_CONTENT,
      publishedAt: now,
      publishedBy: admin.uid,
    });
    console.log('  seeded siteContent/published with the default landing page');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
