import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import type { Item, Interest } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { getApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { ensureThread } from '@/hooks/useThread';
import { Clock, MapPin, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export function ItemDetailPage() {
  const { itemId } = useParams();
  const { user, claims, charity } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    const unsub = onSnapshot(doc(db, 'items', itemId), (snap) => {
      setItem(snap.exists() ? (snap.data() as Item) : null);
    });
    return () => unsub();
  }, [itemId]);

  useEffect(() => {
    if (!itemId || !item) return;
    if (item.ownerUid !== user?.uid && claims?.role !== 'admin') return;
    const unsub = onSnapshot(collection(db, 'items', itemId, 'interests'), (snap) => {
      setInterests(snap.docs.map((d) => d.data() as Interest));
    });
    return () => unsub();
  }, [itemId, item?.ownerUid, user?.uid, claims?.role]);

  if (!item) return <div className="container py-6 text-muted-foreground">Loading…</div>;

  const isOwner = user?.uid === item.ownerUid;
  const isCharity = claims?.role === 'charity' && claims?.approved;
  const hasInterest = isCharity && claims?.charityId
    ? interests.some((i) => i.charityId === claims.charityId)
    : false;

  async function expressInterest() {
    setBusy(true);
    try {
      await getApi().expressInterest(item!.id, { message: message.trim() || undefined });
      toast({ title: 'Interest sent', variant: 'success' });
      setMessage('');
    } catch (err) {
      toast({ title: 'Could not express interest', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!claims?.charityId) return;
    setBusy(true);
    try {
      await getApi().withdrawInterest(item!.id, claims.charityId);
      toast({ title: 'Interest withdrawn' });
    } catch (err) {
      toast({ title: 'Could not withdraw', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    if (!item || !user || !charity || !claims?.charityId) return;
    const threadId = await ensureThread({
      item,
      charityId: claims.charityId,
      charityOwnerUid: user.uid,
      asUid: user.uid,
    });
    navigate(`/inbox/${threadId}`);
  }

  async function select(charityId: string) {
    setBusy(true);
    try {
      await getApi().finalizeRecipient(item!.id, { charityId });
      toast({ title: 'Selected', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not select', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-6 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {item.images.map((img) => (
            <img
              key={img.path}
              src={img.url}
              alt={item.title}
              className="rounded-lg aspect-square object-cover"
              loading="lazy"
            />
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{item.title}</CardTitle>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.description && <p className="text-sm">{item.description}</p>}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location.city ?? 'Nearby'}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(item.interestDeadline)}</span>
              {item.aiCategory && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{item.aiCategory}</span>}
            </div>
            {item.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.aiTags.map((t) => (
                  <span key={t} className="text-xs rounded-full bg-muted px-2 py-0.5">{t}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {item.aiStatus === 'pending' && (
          <div className="rounded-lg border bg-accent/30 p-3 text-xs text-accent-foreground">
            We're scanning the photos now. Tags appear here in a few seconds.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isCharity && item.status === 'active' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Express interest</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {hasInterest ? (
                <>
                  <p className="text-sm text-muted-foreground">You've expressed interest. The poster will choose a recipient after the interest window closes.</p>
                  <div className="flex gap-2">
                    <Button onClick={openChat} variant="outline" className="flex-1"><MessageCircle className="h-4 w-4 mr-2" />Chat</Button>
                    <Button onClick={withdraw} disabled={busy} variant="ghost">Withdraw</Button>
                  </div>
                </>
              ) : (
                <>
                  <Textarea
                    placeholder="Optional: short note for the poster"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={expressInterest} disabled={busy} className="w-full">
                    {busy ? 'Sending…' : 'Express interest'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interested charities ({interests.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {interests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one yet — your item just went live.</p>
              ) : (
                interests.map((i) => (
                  <div key={i.charityId} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{i.charityName}</div>
                      {i.message && <div className="text-xs text-muted-foreground mt-0.5">{i.message}</div>}
                    </div>
                    {item.status === 'given' && item.selectedCharityId === i.charityId ? (
                      <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Selected</Badge>
                    ) : item.status === 'active' || item.status === 'reserved' ? (
                      <Button size="sm" onClick={() => select(i.charityId)} disabled={busy}>Select</Button>
                    ) : null}
                  </div>
                ))
              )}
              {item.status === 'given' && item.selectedCharityId && (
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/inbox/${item.id}_${item.selectedCharityId}`}>Open chat</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
