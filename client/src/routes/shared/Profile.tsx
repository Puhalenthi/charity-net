import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { initials } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export function ProfilePage() {
  const { user, charity, signOut, refresh } = useAuth();
  const { toast } = useToast();
  const [radius, setRadius] = useState(user?.searchRadiusKm ?? 10);

  if (!user) return null;

  async function saveRadius() {
    await updateDoc(doc(db, 'users', user!.uid), { searchRadiusKm: radius, updatedAt: Date.now() });
    await refresh();
    toast({ title: 'Saved', variant: 'success' });
  }

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

      <Card>
        <CardHeader><CardTitle>Search radius</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Default radius</span>
            <span className="font-medium">{radius} km</span>
          </div>
          <Slider
            min={MIN_SEARCH_RADIUS_KM}
            max={MAX_SEARCH_RADIUS_KM}
            step={1}
            value={[radius]}
            onValueChange={(v) => setRadius(v[0] ?? radius)}
          />
          <Button onClick={saveRadius}>Save</Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={signOut}>Sign out</Button>
    </div>
  );
}
