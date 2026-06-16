import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Thread } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export function useInbox() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'threads'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessage.createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => d.data() as Thread));
    });
    return () => unsub();
  }, [user?.uid]);
  return threads;
}
