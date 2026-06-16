import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import type { Item } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { ItemCard } from '@/components/items/ItemCard';
import { ImagePlus, MapPin } from 'lucide-react';

export function PersonHome() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(
        collection(db, 'items'),
        where('ownerUid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(6),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => d.data() as Item));
    })().catch(console.error);
  }, [user?.uid]);

  return (
    <div className="container py-6 sm:py-8 space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/40 p-6 sm:p-10 border">
        <h1 className="text-2xl sm:text-3xl font-bold">Hello {user?.displayName?.split(' ')[0] ?? 'there'}.</h1>
        <p className="text-muted-foreground mt-1 max-w-xl">
          Have something to give away? Snap a photo — local charities will see it and reach out.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button asChild size="lg">
            <Link to="/post"><ImagePlus className="mr-2 h-4 w-4" /> Post an item</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/charities"><MapPin className="mr-2 h-4 w-4" /> See nearby charities</Link>
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your recent items</h2>
        {items.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            You haven't posted anything yet. <Link to="/post" className="text-primary font-medium">Post your first item</Link>.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>
    </div>
  );
}
