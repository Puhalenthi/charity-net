/**
 * Seeds the local emulator with a handful of demo charities and items.
 * Requires FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST to be set.
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { INTEREST_WINDOW_MS, geohashFor } from '@charity-net/shared';

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'charity-net-dev',
    credential: applicationDefault(),
  });
}
const auth = getAuth();
const db = getFirestore();

async function ensureUser(email: string, password: string) {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return auth.createUser({ email, password, displayName: email });
  }
}

async function main() {
  const personEmail = 'person@charitynet.com';
  const charityEmail = 'charity@charitynet.com';
  const adminEmail = 'admin@charitynet.com';

  const now = Date.now();
  const person = await ensureUser(personEmail, 'password123');
  const charity = await ensureUser(charityEmail, 'password123');
  const admin = await ensureUser(adminEmail, 'password123');

  await auth.setCustomUserClaims(person.uid, { role: 'person', approved: true });
  await auth.setCustomUserClaims(admin.uid, { role: 'admin', approved: true });

  // The admin needs a `users/` doc too — without it `/api/me` returns
  // { user: null }, and the client's HomeRouter falls back to the landing page
  // on sign-in (looking like login "does nothing" / bounces to the homepage).
  await db.collection('users').doc(admin.uid).set({
    uid: admin.uid,
    role: 'admin',
    displayName: 'Platform Admin',
    email: adminEmail,
    searchRadiusKm: 10,
    notificationPrefs: { email: true, inApp: true },
    createdAt: now,
    updatedAt: now,
  });

  const charityRef = db.collection('charities').doc();
  const charityLoc = { lat: 52.52, lng: 13.405 };
  await charityRef.set({
    id: charityRef.id,
    name: 'Greenwood Helping Hands',
    description: 'A small local charity that distributes donated items to families in need.',
    status: 'approved',
    ownerUid: charity.uid,
    location: { ...charityLoc, geohash: geohashFor(charityLoc), city: 'Berlin' },
    categoriesAccepted: ['furniture', 'clothing', 'kitchen', 'books'],
    verification: { documents: [] },
    approvedAt: now,
    approvedByUid: admin.uid,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection('users').doc(charity.uid).set({
    uid: charity.uid,
    role: 'charity',
    displayName: 'Charity Owner',
    email: charityEmail,
    searchRadiusKm: 15,
    notificationPrefs: { email: true, inApp: true },
    charityId: charityRef.id,
    defaultLocation: { ...charityLoc, geohash: geohashFor(charityLoc), city: 'Berlin' },
    createdAt: now,
    updatedAt: now,
  });
  await auth.setCustomUserClaims(charity.uid, {
    role: 'charity',
    charityId: charityRef.id,
    approved: true,
  });

  await db.collection('users').doc(person.uid).set({
    uid: person.uid,
    role: 'person',
    displayName: 'Sample Person',
    email: personEmail,
    searchRadiusKm: 10,
    notificationPrefs: { email: true, inApp: true },
    defaultLocation: { lat: 52.515, lng: 13.41, geohash: geohashFor({ lat: 52.515, lng: 13.41 }), city: 'Berlin' },
    createdAt: now,
    updatedAt: now,
  });

  const wishRef = db.collection('charities').doc(charityRef.id).collection('wishlist').doc();
  await wishRef.set({
    id: wishRef.id,
    tags: ['sofa', 'book', 'cookware'],
    keywords: [],
    categories: ['furniture', 'books', 'kitchen'],
    notes: 'Anything for a family rehoming.',
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  const itemRef = db.collection('items').doc();
  const itemLoc = { lat: 52.518, lng: 13.408 };
  await itemRef.set({
    id: itemRef.id,
    ownerUid: person.uid,
    title: 'Beige fabric sofa',
    description: 'Well-loved but clean. Slight wear on one armrest.',
    images: [{ path: 'demo/sofa.jpg', url: 'https://placehold.co/800x600?text=Sofa' }],
    location: { ...itemLoc, geohash: geohashFor(itemLoc), city: 'Berlin' },
    aiStatus: 'done',
    aiCategory: 'furniture',
    aiCondition: 'good',
    aiTags: ['sofa', 'couch'],
    aiKeywords: ['fabric', 'beige'],
    aiSafety: { nsfw: false, weapon: false, hazardous: false, pii: false },
    status: 'active',
    interestDeadline: now + INTEREST_WINDOW_MS,
    interestCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log('Seed complete:');
  console.log(`  person:  ${personEmail} / password123  (uid=${person.uid})`);
  console.log(`  charity: ${charityEmail} / password123 (uid=${charity.uid})`);
  console.log(`  admin:   ${adminEmail} / password123   (uid=${admin.uid})`);
  console.log(`  itemId:  ${itemRef.id}`);
  console.log(`  charity: ${charityRef.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
