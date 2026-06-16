import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { useNearbyItems } from '@/hooks/useNearbyItems';
import { MapView, type MapPin } from '@/components/map/MapView';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBrowserLocation } from '@/lib/geolocation';
import { formatRelative } from '@/lib/utils';

export function ItemsMapPage() {
  const { charity } = useAuth();
  const [center, setCenter] = useState(
    charity?.location ? { lat: charity.location.lat, lng: charity.location.lng } : null,
  );
  const [radius, setRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const { items } = useNearbyItems(center, radius);

  useEffect(() => {
    if (center) return;
    (async () => {
      const pos = await getBrowserLocation();
      if (pos) setCenter(pos);
    })().catch(console.error);
  }, [center]);

  const pins: MapPin[] = useMemo(
    () =>
      items.map((it) => ({
        id: it.id,
        position: { lat: it.location.lat, lng: it.location.lng },
        title: it.title,
        thumbnailUrl: it.images[0]?.url,
        jitter: true,
        jitterSeed: it.id,
      })),
    [items],
  );
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-bold">Map view</h1>
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
      {center ? (
        <MapView
          center={center}
          radiusKm={radius}
          pins={pins}
          renderPopup={(id) => {
            const it = byId.get(id);
            if (!it) return null;
            return (
              <div className="p-1 w-56">
                {it.images[0] && (
                  <img src={it.images[0].url} alt={it.title} className="rounded-md mb-2 aspect-video object-cover" />
                )}
                <div className="font-semibold text-sm">{it.title}</div>
                <div className="text-xs text-muted-foreground">{formatRelative(it.interestDeadline)} to act</div>
                <Link to={`/items/${it.id}`} className="block mt-2 text-primary text-xs font-medium">View →</Link>
              </div>
            );
          }}
        />
      ) : (
        <div className="grid place-items-center h-64 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          Set your location to see nearby items.
        </div>
      )}
    </div>
  );
}
