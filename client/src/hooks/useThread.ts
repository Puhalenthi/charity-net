import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import type { Item, Message, Thread } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export function useThread(threadId: string | undefined) {
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (!threadId) return;
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

  async function send(text: string): Promise<void> {
    if (!threadId || !user) return;
    const msgRef = collection(db, 'threads', threadId, 'messages');
    await addDoc(msgRef, {
      fromUid: user.uid,
      text: text.trim(),
      createdAt: Date.now(),
    });
  }

  return { thread, messages, send };
}

export async function ensureThread(opts: {
  item: Item;
  charityId: string;
  charityOwnerUid: string;
  asUid: string;
}): Promise<string> {
  const threadId = `${opts.item.id}_${opts.charityId}`;
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
      closed: false,
      createdAt: Date.now(),
    });
  }
  return threadId;
}
