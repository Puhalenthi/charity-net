import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Item } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { ItemCard } from '@/components/items/ItemCard';

export function MyItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'items'),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => d.data() as Item)));
    return () => unsub();
  }, [user?.uid]);
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-4">My items</h1>
      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          You haven't posted any items yet.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}
    </div>
  );
}
