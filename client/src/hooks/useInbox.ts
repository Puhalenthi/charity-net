import { useEffect, useState } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import type { Thread } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

function activity(t: Thread): number {
  return t.lastMessage?.createdAt ?? t.createdAt;
}

export function useInbox() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    if (!user) return;
    // No orderBy on `lastMessage.createdAt`: Firestore would drop threads that
    // don't have that field yet, hiding brand-new conversations. We sort in JS.
    const q = query(collection(db, 'threads'), where('participants', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => d.data() as Thread);
      setThreads(
        all
          .filter((t) => !(t.deletedFor ?? []).includes(user.uid))
          .sort((a, b) => activity(b) - activity(a)),
      );
    });
    return () => unsub();
  }, [user?.uid]);
  return threads;
}

// "Delete" a chat for the current user only — it disappears from their inbox
// but the other participant keeps their copy, and a new message brings it back.
export async function hideThread(threadId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'threads', threadId), { deletedFor: arrayUnion(uid) });
}
