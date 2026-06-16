import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { useNearbyCharities } from '@/hooks/useNearbyCharities';
import { MapView, type MapPin } from '@/components/map/MapView';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBrowserLocation } from '@/lib/geolocation';

export function CharityMapPage() {
  const { user } = useAuth();
  const [center, setCenter] = useState(user?.defaultLocation ?? null);
  const [radius, setRadius] = useState(user?.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM);

  useEffect(() => {
    if (center) return;
    (async () => {
      const pos = await getBrowserLocation();
      if (pos) setCenter({ lat: pos.lat, lng: pos.lng, geohash: '' });
    })().catch(console.error);
  }, [center]);

  const { charities } = useNearbyCharities(center, radius);
  const pins: MapPin[] = useMemo(
    () => charities.map((c) => ({ id: c.id, position: c.location, title: c.name, thumbnailUrl: c.logoUrl })),
    [charities],
  );
  const byId = useMemo(() => new Map(charities.map((c) => [c.id, c])), [charities]);

  return (
    <div className="container py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nearby charities</h1>
        <p className="text-muted-foreground">See who is local and what they're looking for.</p>
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
              if (pos) setCenter({ lat: pos.lat, lng: pos.lng, geohash: '' });
            }}
          >
            Use my location
          </Button>
        </CardContent>
      </Card>
      {center ? (
        <MapView
          center={{ lat: center.lat, lng: center.lng }}
          radiusKm={radius}
          pins={pins}
          renderPopup={(id) => {
            const c = byId.get(id);
            if (!c) return null;
            return (
              <div className="p-1">
                <div className="font-semibold">{c.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.categoriesAccepted.slice(0, 4).map((cat) => (
                    <Badge key={cat} variant="secondary">{cat}</Badge>
                  ))}
                </div>
                {c.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{c.description}</p>}
                <div className="mt-2"><Link to="/post" className="text-primary text-xs font-medium">Post an item →</Link></div>
              </div>
            );
          }}
        />
      ) : (
        <div className="grid place-items-center h-64 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          Set your location to see nearby charities.
        </div>
      )}
    </div>
  );
}
