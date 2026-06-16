import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelative } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export function NotificationsPage() {
  const { user } = useAuth();
  const { items } = useNotifications();
  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const linkTo = n.itemId ? `/items/${n.itemId}` : n.threadId ? `/inbox/${n.threadId}` : '#';
            return (
              <Link
                key={n.id}
                to={linkTo}
                onClick={() => {
                  if (!user || n.read) return;
                  void updateDoc(doc(db, 'notifications', user.uid, 'entries', n.id), { read: true });
                }}
              >
                <Card className={n.read ? '' : 'border-primary/40 bg-primary/5'}>
                  <CardContent className="p-4">
                    <div className="flex justify-between gap-2">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{formatRelative(n.createdAt as number)}</div>
                    </div>
                    {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
