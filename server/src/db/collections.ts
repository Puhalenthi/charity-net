import { db } from './admin.js';

export const COL = {
  users: () => db.collection('users'),
  charities: () => db.collection('charities'),
  charityWishlist: (charityId: string) =>
    db.collection('charities').doc(charityId).collection('wishlist'),
  items: () => db.collection('items'),
  itemInterests: (itemId: string) =>
    db.collection('items').doc(itemId).collection('interests'),
  threads: () => db.collection('threads'),
  messages: (threadId: string) =>
    db.collection('threads').doc(threadId).collection('messages'),
  notifications: (uid: string) =>
    db.collection('notifications').doc(uid).collection('entries'),
  adminAudit: () => db.collection('adminAudit'),
  aiUsage: () => db.collection('aiUsage'),
  reports: () => db.collection('reports'),
} as const;
