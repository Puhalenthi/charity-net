import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm --filter @charity-net/scripts set-admin <email>');
    process.exit(1);
  }
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: applicationDefault(),
    });
  }
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: 'admin', approved: true });
  console.log(`Granted admin role to ${email} (${user.uid}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
