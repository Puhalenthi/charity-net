import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ITEM_CATEGORIES, geohashFor } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { getApi } from '@/lib/api';
import { getBrowserLocation, geocodeQuery } from '@/lib/geolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';

export function CompleteSignupPage() {
  const { firebaseUser, user, refresh, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && !firebaseUser) return <Navigate to="/login" replace />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen container py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Tell us who you are</h1>
        <p className="text-muted-foreground mb-6">Pick the option that fits you best.</p>
        <Tabs defaultValue="person">
          <TabsList>
            <TabsTrigger value="person">I'm a person</TabsTrigger>
            <TabsTrigger value="charity">I work at a charity</TabsTrigger>
          </TabsList>
          <TabsContent value="person">
            <PersonForm onDone={async () => { await refresh(); navigate('/'); }} />
          </TabsContent>
          <TabsContent value="charity">
            <CharityForm onDone={async () => { await refresh(); navigate('/pending-approval'); }} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PersonForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [displayName, setName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [resolved, setResolved] = useState<{ lat: number; lng: number; city?: string; postalCode?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={displayName} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="space-y-1">
          <Label>City or postal code (optional)</Label>
          <div className="flex gap-2">
            <Input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="e.g. Berlin 10115" />
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                if (!locationQuery.trim()) {
                  const pos = await getBrowserLocation();
                  if (pos) setResolved(pos);
                  return;
                }
                try {
                  const r = await geocodeQuery(locationQuery);
                  setResolved(r);
                } catch (err) {
                  toast({ title: 'Could not look up location', description: (err as Error).message, variant: 'destructive' });
                }
              }}
            >
              Use my location
            </Button>
          </div>
          {resolved && (
            <p className="text-xs text-muted-foreground">
              Set to {resolved.city ?? `${resolved.lat.toFixed(3)}, ${resolved.lng.toFixed(3)}`}
            </p>
          )}
        </div>
        <Button
          disabled={loading || !displayName}
          onClick={async () => {
            setLoading(true);
            try {
              await getApi().completeSignup({
                role: 'person',
                displayName,
                defaultLocation: resolved
                  ? { ...resolved, geohash: geohashFor(resolved) }
                  : undefined,
              });
              await onDone();
            } catch (err) {
              toast({ title: 'Could not finish signup', description: (err as Error).message, variant: 'destructive' });
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Saving…' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}

function CharityForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [displayName, setName] = useState('');
  const [charityName, setCharityName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsite] = useState('');
  const [registrationNumber, setRegistration] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [resolved, setResolved] = useState<{ lat: number; lng: number; city?: string; postalCode?: string } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleCategory(c: string) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your charity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Your name</Label>
            <Input value={displayName} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Charity name</Label>
            <Input value={charityName} onChange={(e) => setCharityName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>What does your charity do?</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Website (optional)</Label>
            <Input value={websiteUrl} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1">
            <Label>Registration number (optional)</Label>
            <Input value={registrationNumber} onChange={(e) => setRegistration(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Where are you based?</Label>
          <div className="flex gap-2">
            <Input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="City or postal code" />
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                if (!locationQuery.trim()) {
                  const pos = await getBrowserLocation();
                  if (pos) setResolved(pos);
                  return;
                }
                try {
                  const r = await geocodeQuery(locationQuery);
                  setResolved(r);
                } catch (err) {
                  toast({ title: 'Could not look up location', description: (err as Error).message, variant: 'destructive' });
                }
              }}
            >
              Locate
            </Button>
          </div>
          {resolved && (
            <p className="text-xs text-muted-foreground">
              {resolved.city ?? `${resolved.lat.toFixed(3)}, ${resolved.lng.toFixed(3)}`}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Categories you accept</Label>
          <div className="flex flex-wrap gap-2">
            {ITEM_CATEGORIES.map((c) => {
              const selected = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={
                    'rounded-full border px-3 py-1 text-xs ' +
                    (selected ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent')
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <Button
          disabled={loading || !displayName || !charityName || !resolved}
          onClick={async () => {
            if (!resolved) return;
            setLoading(true);
            try {
              await getApi().completeSignup({
                role: 'charity',
                displayName,
                charityName,
                description,
                websiteUrl: websiteUrl || undefined,
                registrationNumber: registrationNumber || undefined,
                location: { ...resolved, geohash: geohashFor(resolved) },
                categoriesAccepted: categories as never,
                documents: [],
              });
              await onDone();
            } catch (err) {
              toast({ title: 'Could not finish signup', description: (err as Error).message, variant: 'destructive' });
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </CardContent>
    </Card>
  );
}
