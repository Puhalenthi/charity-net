import { useEffect, useState } from 'react';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { useNearbyItems } from '@/hooks/useNearbyItems';
import { ItemCard } from '@/components/items/ItemCard';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBrowserLocation } from '@/lib/geolocation';

export function ItemsFeedPage() {
  const { charity } = useAuth();
  const [center, setCenter] = useState(
    charity?.location ? { lat: charity.location.lat, lng: charity.location.lng } : null,
  );
  const [radius, setRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const { items, loading } = useNearbyItems(center, radius);

  useEffect(() => {
    if (center) return;
    (async () => {
      const pos = await getBrowserLocation();
      if (pos) setCenter(pos);
    })().catch(console.error);
  }, [center]);

  return (
    <div className="container py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Available nearby</h1>
        <p className="text-muted-foreground">Items posted within your radius. Express interest before the 24h window closes.</p>
      </div>
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Radius</span>
              <span className="font-medium">{radius} km</span>
            </div>
            <Slider
              min={MIN_SEARCH_RADIUS_KM}
              max={MAX_SEARCH_RADIUS_KM}
              step={1}
              value={[radius]}
              onValueChange={(v) => setRadius(v[0] ?? radius)}
            />
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const pos = await getBrowserLocation();
              if (pos) setCenter(pos);
            }}
          >
            Use my location
          </Button>
        </CardContent>
      </Card>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Nothing in your radius right now. Try increasing the radius.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}
    </div>
  );
}
