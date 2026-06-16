import { useEffect, useState } from 'react';
import type { Charity } from '@charity-net/shared';
import { getApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

export function AdminApprovalsPage() {
  const { toast } = useToast();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getApi().pendingCharities();
      setCharities(data.charities);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function approve(charity: Charity) {
    try {
      await getApi().approveCharity(charity.id, {});
      toast({ title: 'Approved', variant: 'success' });
      await load();
    } catch (err) {
      toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' });
    }
  }

  async function reject(charity: Charity, reason: string) {
    if (!reason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    try {
      await getApi().rejectCharity(charity.id, { reason });
      toast({ title: 'Rejected' });
      await load();
    } catch (err) {
      toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' });
    }
  }

  return (
    <div className="container py-6 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Charity approvals</h1>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && charities.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No pending applications.
        </div>
      )}
      {charities.map((c) => (
        <ApprovalCard key={c.id} charity={c} onApprove={() => approve(c)} onReject={(r) => reject(c, r)} />
      ))}
    </div>
  );
}

function ApprovalCard({
  charity,
  onApprove,
  onReject,
}: {
  charity: Charity;
  onApprove: () => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{charity.name}</span>
          <span className="text-xs text-muted-foreground">{charity.location.city ?? ''}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {charity.description && <p>{charity.description}</p>}
        {charity.websiteUrl && (
          <a className="text-primary text-xs" href={charity.websiteUrl} target="_blank" rel="noreferrer">
            {charity.websiteUrl}
          </a>
        )}
        {charity.verification?.registrationNumber && (
          <div className="text-xs text-muted-foreground">Reg #: {charity.verification.registrationNumber}</div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {charity.categoriesAccepted.map((c) => (
            <span key={c} className="text-xs rounded-full bg-muted px-2 py-0.5">{c}</span>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onApprove}>Approve</Button>
          <Button variant="outline" onClick={() => setShowReject((v) => !v)}>
            {showReject ? 'Cancel' : 'Reject'}
          </Button>
        </div>
        {showReject && (
          <div className="space-y-2 pt-2">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" rows={3} />
            <Button variant="destructive" onClick={() => onReject(reason)}>Send rejection</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
