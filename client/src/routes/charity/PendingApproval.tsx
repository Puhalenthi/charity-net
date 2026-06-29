import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export function PendingApprovalPage() {
  const { signOut, refresh, charity } = useAuth();
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
            {charity?.name ?? 'Your application'} is pending admin approval. You'll get an in-app
            notification the moment we've checked things over.
          </p>
          <p className="text-xs text-muted-foreground">
            Already approved? Refresh your session below to pick up the change.
          </p>
          <div className="flex gap-2">
            <Button onClick={refresh} variant="outline">Refresh</Button>
            <Button onClick={signOut} variant="ghost" asChild>
              <Link to="/">Sign out</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
