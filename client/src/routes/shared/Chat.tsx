import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useInbox, hideThread } from '@/hooks/useInbox';
import { useThread } from '@/hooks/useThread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { cn, formatRelative, initials } from '@/lib/utils';

export function ChatPage() {
  const { threadId } = useParams();
  const threads = useInbox();
  const { user } = useAuth();

  return (
    <div className="container py-4">
      <div className="grid h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl border bg-card md:grid-cols-[320px_1fr]">
        {/* Conversation list — hidden on mobile once a thread is open */}
        <aside className={cn('flex flex-col border-r md:flex', threadId ? 'hidden' : 'flex')}>
          <div className="border-b px-4 py-3">
            <h1 className="text-lg font-bold">Chats</h1>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</div>
            ) : (
              threads.map((t) => {
                const unread = user ? t.unread[user.uid] ?? 0 : 0;
                const active = t.id === threadId;
                return <ConversationRow key={t.id} threadId={t.id} itemId={t.itemId} charityId={t.charityId} last={t.lastMessage} unread={unread} active={active} />;
              })
            )}
          </div>
        </aside>

        {/* Thread pane */}
        <section className={cn('min-w-0 flex-col md:flex', threadId ? 'flex' : 'hidden md:flex')}>
          {threadId ? <ThreadPane threadId={threadId} /> : <EmptyThread />}
        </section>
      </div>
    </div>
  );
}

function ConversationRow({
  threadId,
  itemId,
  charityId,
  last,
  unread,
  active,
}: {
  threadId: string;
  itemId: string;
  charityId: string;
  last?: { text: string; createdAt: number };
  unread: number;
  active: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function del(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setBusy(true);
    try {
      await hideThread(threadId, user.uid);
      toast({ title: 'Chat deleted' });
    } catch (err) {
      toast({ title: 'Could not delete chat', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link
      to={`/inbox/${threadId}`}
      className={cn(
        'group flex items-center gap-3 border-b px-3 py-3 transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <Avatar><AvatarFallback>{initials(charityId.slice(0, 2))}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-medium">Item {itemId.slice(-6)}</div>
          {last && <div className="shrink-0 text-xs text-muted-foreground">{formatRelative(last.createdAt)}</div>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{last?.text ?? 'New conversation'}</div>
      </div>
      {unread > 0 && (
        <span className="grid min-w-[1.25rem] place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {unread}
        </span>
      )}
      <button
        type="button"
        aria-label="Delete chat"
        disabled={busy}
        onClick={del}
        className="hidden h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:grid"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Link>
  );
}

function ThreadPane({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { thread, messages, send } = useThread(threadId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await send(text);
    } catch (err) {
      setDraft(text); // restore so the message isn't lost
      toast({ title: 'Message not sent', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link to="/inbox"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 text-sm">
          <div className="font-medium">{thread ? `Item ${thread.itemId.slice(-6)}` : 'Chat'}</div>
          {thread && <Link to={`/items/${thread.itemId}`} className="text-xs text-primary">View item</Link>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4 scrollbar-thin">
        {messages.map((m) => {
          const mine = m.fromUid === user?.uid;
          return (
            <div key={m.id} className={cn('flex animate-in fade-in slide-in-from-bottom-1 duration-300', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm', mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card')}>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={cn('mt-1 text-[10px]', mine ? 'opacity-80' : 'text-muted-foreground')}>{formatRelative(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Say hi 👋</div>
        )}
      </div>

      <div className="flex gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button onClick={() => void handleSend()} disabled={!draft.trim() || sending}><Send className="h-4 w-4" /></Button>
      </div>
    </>
  );
}

function EmptyThread() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-2 text-muted-foreground md:flex">
      <MessageSquare className="h-10 w-10 opacity-40" />
      <p className="text-sm">Select a conversation to start chatting.</p>
    </div>
  );
}
