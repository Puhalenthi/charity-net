import { Link } from 'react-router-dom';
import { useInbox } from '@/hooks/useInbox';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { formatRelative, initials } from '@/lib/utils';

export function InboxPage() {
  const threads = useInbox();
  const { user } = useAuth();
  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      {threads.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No conversations yet.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const unread = user ? t.unread[user.uid] ?? 0 : 0;
            return (
              <Link key={t.id} to={`/inbox/${t.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar><AvatarFallback>{initials(t.charityId.slice(0, 2))}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">Item {t.itemId.slice(-6)}</div>
                        {t.lastMessage && (
                          <div className="text-xs text-muted-foreground">{formatRelative(t.lastMessage.createdAt)}</div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {t.lastMessage?.text ?? 'New conversation'}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{unread}</span>
                    )}
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
