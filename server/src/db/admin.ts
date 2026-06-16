import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from '../config/env.js';

function ensureApp() {
  if (getApps().length) return;
  const e = env();
  initializeApp({
    projectId: e.FIREBASE_PROJECT_ID,
    credential: applicationDefault(),
    storageBucket: e.FIREBASE_STORAGE_BUCKET,
  });
}

ensureApp();

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export { FieldValue, Timestamp };
