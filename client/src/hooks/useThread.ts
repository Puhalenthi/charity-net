import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  addDoc,
  getDoc,
  increment,
} from 'firebase/firestore';
import { makeThreadId } from '@charity-net/shared';
import type { Item, Message, Thread } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export function useThread(threadId: string | undefined) {
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (!threadId) {
      setThread(null);
      setMessages([]);
      return;
    }
    const tRef = doc(db, 'threads', threadId);
    const unsubT = onSnapshot(tRef, (snap) => {
      setThread(snap.exists() ? (snap.data() as Thread) : null);
    });
    const mq = query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubM = onSnapshot(mq, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })));
    });
    return () => {
      unsubT();
      unsubM();
    };
  }, [threadId]);

  // Clear my own unread badge once I'm looking at the thread.
  useEffect(() => {
    if (!threadId || !user || !thread) return;
    if ((thread.unread?.[user.uid] ?? 0) > 0) {
      void updateDoc(doc(db, 'threads', threadId), { [`unread.${user.uid}`]: 0 });
    }
  }, [threadId, user?.uid, thread?.unread?.[user?.uid ?? '']]);

  async function send(text: string): Promise<void> {
    if (!threadId || !user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const threadRef = doc(db, 'threads', threadId);
    // The thread doc must exist before a message can be written (the security
    // rules read its participants). Either side may open the chat first, so
    // create it on demand if it isn't there yet.
    const current = thread ?? (await ensureThreadFromId(threadId));
    const now = Date.now();
    await addDoc(collection(db, 'threads', threadId, 'messages'), {
      fromUid: user.uid,
      text: trimmed,
      createdAt: now,
    });
    // Keep the thread's denormalised summary current from the client so the
    // Inbox works without the messaging Cloud Function (not run in local dev).
    // Bump the *other* participant's unread and un-hide the chat for both.
    const otherUid = current?.participants.find((p) => p !== user.uid);
    await updateDoc(threadRef, {
      lastMessage: { text: trimmed, fromUid: user.uid, createdAt: now },
      deletedFor: [],
      ...(otherUid ? { [`unread.${otherUid}`]: increment(1) } : {}),
    });
  }

  return { thread, messages, send };
}

/**
 * Ensure a thread doc exists, deriving its participants from the deterministic
 * id (`${itemId}_${charityId}`). Works from either side — the poster or the
 * charity owner — since both can read the item and the (approved) charity.
 */
export async function ensureThreadFromId(threadId: string): Promise<Thread | null> {
  const ref = doc(db, 'threads', threadId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as Thread;

  const sep = threadId.indexOf('_');
  if (sep < 0) return null;
  const itemId = threadId.slice(0, sep);
  const charityId = threadId.slice(sep + 1);

  const [itemSnap, charitySnap] = await Promise.all([
    getDoc(doc(db, 'items', itemId)),
    getDoc(doc(db, 'charities', charityId)),
  ]);
  if (!itemSnap.exists() || !charitySnap.exists()) return null;
  const ownerUid = (itemSnap.data() as Item).ownerUid;
  const charityOwnerUid = (charitySnap.data() as { ownerUid: string }).ownerUid;

  const data = {
    id: threadId,
    itemId,
    ownerUid,
    charityId,
    charityOwnerUid,
    participants: [ownerUid, charityOwnerUid],
    unread: {},
    deletedFor: [],
    closed: false,
    createdAt: Date.now(),
  };
  await setDoc(ref, data);
  return data as Thread;
}

export async function ensureThread(opts: {
  item: Item;
  charityId: string;
  charityOwnerUid: string;
  asUid: string;
}): Promise<string> {
  const threadId = makeThreadId(opts.item.id, opts.charityId);
  const ref = doc(db, 'threads', threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: threadId,
      itemId: opts.item.id,
      ownerUid: opts.item.ownerUid,
      charityId: opts.charityId,
      charityOwnerUid: opts.charityOwnerUid,
      participants: [opts.item.ownerUid, opts.charityOwnerUid],
      unread: {},
      deletedFor: [],
      closed: false,
      createdAt: Date.now(),
    });
  }
  return threadId;
}
