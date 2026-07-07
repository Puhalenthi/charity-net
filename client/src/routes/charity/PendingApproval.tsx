import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

export function PendingApprovalPage() {
  const { signOut, refresh, charity, claims } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // Live-watch our own charity doc. The moment an admin approves it (even from
  // another browser), refresh the ID token to pick up the new claim and move on.
  useEffect(() => {
    if (!charity?.id) return;
    const unsub = onSnapshot(doc(db, 'charities', charity.id), async (snap) => {
      if (snap.exists() && (snap.data() as { status?: string }).status === 'approved') {
        await refresh();
        navigate('/', { replace: true });
      }
    });
    return () => unsub();
  }, [charity?.id]);

  // Already approved (claim caught up) — leave the waiting room.
  if (claims?.approved) return <Navigate to="/" replace />;

  async function checkNow() {
    setChecking(true);
    try {
      await refresh();
      // If refresh() picked up the approval, the claims guard above redirects on
      // the next render. Otherwise let the user know nothing has changed yet.
      toast({ title: 'Checked', description: "Still pending. We'll move you over automatically once approved." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
            <Clock className="h-5 w-5 text-accent-foreground" />
          </div>
          <CardTitle className="pt-2">We're reviewing your charity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {charity?.name ?? 'Your application'} is pending admin approval. This page updates
            itself the moment you're approved, so there's no need to refresh.
          </p>
          <div className="flex gap-2">
            <Button onClick={checkNow} disabled={checking} variant="outline">
              {checking ? 'Checking…' : 'Check now'}
            </Button>
            <Button onClick={signOut} variant="ghost" asChild>
              <Link to="/">Sign out</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
