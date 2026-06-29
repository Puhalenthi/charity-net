import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/utils';

export function ProfilePage() {
  const { user, charity, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="container py-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.photoURL ? <AvatarImage src={user.photoURL} /> : null}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{user.displayName}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="text-xs text-muted-foreground capitalize mt-1">{user.role}</div>
          </div>
        </CardContent>
      </Card>

      {charity && (
        <Card>
          <CardHeader><CardTitle>Your charity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="font-medium">{charity.name}</div>
            {charity.description && <p className="text-sm text-muted-foreground">{charity.description}</p>}
            <div className="text-xs text-muted-foreground">{charity.location.city ?? ''}</div>
            <div className="text-xs">Status: <span className="capitalize">{charity.status}</span></div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    </div>
  );
}
