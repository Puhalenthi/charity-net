import type { Item, NotificationType } from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { FieldValue } from '../db/admin.js';

// Notifications are in-app only (the "Alerts" feed). There is no email channel.

type WriteOpts = {
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  itemId?: string;
  threadId?: string;
  charityId?: string;
};

export async function writeInAppNotification(opts: WriteOpts): Promise<void> {
  const ref = COL.notifications(opts.uid).doc();
  await ref.set({
    id: ref.id,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    itemId: opts.itemId ?? null,
    threadId: opts.threadId ?? null,
    charityId: opts.charityId ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function notifyCharityWishlistMatch(opts: {
  charityOwnerUid: string;
  charityName: string;
  item: Item;
  score: number;
  wishlistNotes?: string;
}): Promise<void> {
  const { item } = opts;
  const title = `New donation matches your wishlist`;
  const body = `${item.title} is available nearby. Tags matched: ${item.aiTags.slice(0, 5).join(', ')}.`;
  await writeInAppNotification({
    uid: opts.charityOwnerUid,
    type: 'wishlist_match',
    title,
    body,
    itemId: item.id,
  });
}

export async function notifyOwnerNewInterest(opts: {
  ownerUid: string;
  charityName: string;
  itemId: string;
  itemTitle: string;
}): Promise<void> {
  await writeInAppNotification({
    uid: opts.ownerUid,
    type: 'new_interest',
    title: `${opts.charityName} is interested in your item`,
    body: `${opts.charityName} would like to receive “${opts.itemTitle}”.`,
    itemId: opts.itemId,
  });
}

export async function notifyCharityApproved(ownerUid: string): Promise<void> {
  await writeInAppNotification({
    uid: ownerUid,
    type: 'charity_approved',
    title: 'Your charity has been approved',
    body: 'You can now post a wishlist and reserve items.',
  });
}

export async function notifyCharityRejected(ownerUid: string, reason: string): Promise<void> {
  await writeInAppNotification({
    uid: ownerUid,
    type: 'charity_rejected',
    title: 'Charity application not approved',
    body: reason,
  });
}

export async function notifySelected(opts: {
  charityOwnerUid: string;
  itemId: string;
  itemTitle: string;
}): Promise<void> {
  await writeInAppNotification({
    uid: opts.charityOwnerUid,
    type: 'selected_as_recipient',
    title: `You were selected to receive an item`,
    body: opts.itemTitle,
    itemId: opts.itemId,
  });
}

export async function notifyNotSelected(opts: {
  charityOwnerUid: string;
  itemId: string;
  itemTitle: string;
}): Promise<void> {
  await writeInAppNotification({
    uid: opts.charityOwnerUid,
    type: 'not_selected',
    title: `Another charity was selected for an item`,
    body: opts.itemTitle,
    itemId: opts.itemId,
  });
}

export async function notifyItemExpired(opts: {
  ownerUid: string;
  itemId: string;
  itemTitle: string;
}): Promise<void> {
  await writeInAppNotification({
    uid: opts.ownerUid,
    type: 'item_expired',
    title: 'Your item expired with no charity selected',
    body: opts.itemTitle,
    itemId: opts.itemId,
  });
}

export async function notifyItemRemoved(opts: {
  ownerUid: string;
  itemId: string;
  itemTitle: string;
  reason: string;
}): Promise<void> {
  await writeInAppNotification({
    uid: opts.ownerUid,
    type: 'item_removed',
    title: 'Your item was removed',
    body: `${opts.itemTitle}: ${opts.reason}`,
    itemId: opts.itemId,
  });
}
