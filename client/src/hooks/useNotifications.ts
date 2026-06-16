import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Notification } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    const col = collection(db, 'notifications', user.uid, 'entries');
    const q = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as Notification));
    });
    return () => unsub();
  }, [user?.uid]);
  const unread = items.filter((i) => !i.read).length;
  return { items, unread };
}
