import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useThread } from '@/hooks/useThread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatRelative } from '@/lib/utils';

export function ThreadPage() {
  const { threadId } = useParams();
  const { user } = useAuth();
  const { thread, messages, send } = useThread(threadId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await send(text);
  }

  return (
    <div className="container py-4 max-w-3xl">
      <div className="flex items-center gap-2 mb-3">
        <Button asChild variant="ghost" size="icon"><Link to="/inbox"><ChevronLeft className="h-4 w-4" /></Link></Button>
        <div className="text-sm">
          <div className="font-medium">{thread ? `Item ${thread.itemId.slice(-6)}` : 'Chat'}</div>
          {thread && (
            <Link to={`/items/${thread.itemId}`} className="text-xs text-primary">View item</Link>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="rounded-lg border bg-card h-[65vh] overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {messages.map((m) => {
          const mine = m.fromUid === user?.uid;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'rounded-2xl px-3 py-2 max-w-[75%] text-sm',
                mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}>
                <div>{m.text}</div>
                <div className={cn('text-[10px] mt-1', mine ? 'opacity-80' : 'text-muted-foreground')}>
                  {formatRelative(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12">Say hi.</div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
