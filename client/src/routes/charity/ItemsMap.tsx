import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import type { Item } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useNearbyItems } from '@/hooks/useNearbyItems';
import { MapView, type MapPin } from '@/components/map/MapView';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { getBrowserLocation } from '@/lib/geolocation';
import { formatRelative } from '@/lib/utils';

type WishRow = { tags?: string[]; categories?: string[]; active?: boolean };

/** Mirrors the server matcher: tag overlap OR category hit against active rows. */
function makeMatcher(rows: WishRow[]) {
  const active = rows.filter((r) => r.active !== false);
  const tags = new Set(active.flatMap((r) => (r.tags ?? []).map((t) => t.toLowerCase())));
  const cats = new Set(active.flatMap((r) => r.categories ?? []));
  return (item: Item) =>
    item.aiTags.some((t) => tags.has(t.toLowerCase())) ||
    (item.aiCategory ? cats.has(item.aiCategory) : false);
}

export function ItemsMapPage() {
  const { charity } = useAuth();
  const [center, setCenter] = useState(
    charity?.location ? { lat: charity.location.lat, lng: charity.location.lng } : null,
  );
  const [radius, setRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const { items } = useNearbyItems(center, radius);
  const [wishRows, setWishRows] = useState<WishRow[]>([]);

  useEffect(() => {
    if (center) return;
    (async () => {
      const pos = await getBrowserLocation();
      if (pos) setCenter(pos);
    })().catch(console.error);
  }, [center]);

  useEffect(() => {
    if (!charity) return;
    (async () => {
      const snap = await getDocs(collection(db, 'charities', charity.id, 'wishlist'));
      setWishRows(snap.docs.map((d) => d.data() as WishRow));
    })().catch(console.error);
  }, [charity?.id]);

  const isMatch = useMemo(() => makeMatcher(wishRows), [wishRows]);

  const pins: MapPin[] = useMemo(
    () =>
      items.map((it) => ({
        id: it.id,
        position: { lat: it.location.lat, lng: it.location.lng },
        title: it.title,
        thumbnailUrl: it.images[0]?.url,
        jitter: true,
        jitterSeed: it.id,
        match: isMatch(it),
      })),
    [items, isMatch],
  );
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Map view</h1>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" /> Matches your wishlist
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" /> Other items
          </span>
        </div>
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
      {center ? (
        <MapView
          center={center}
          radiusKm={radius}
          pins={pins}
          renderPopup={(id) => {
            const it = byId.get(id);
            if (!it) return null;
            const match = isMatch(it);
            return (
              <div className="w-60">
                <div className="relative mb-2 h-32 w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-sky-400/20">
                  {it.images[0] ? (
                    <img src={it.images[0].url} alt={it.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No photo</div>
                  )}
                  {match && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#a855f7] px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                      <Sparkles className="h-3 w-3" /> Wishlist match
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold leading-tight">{it.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{formatRelative(it.interestDeadline)} to act</div>
                <Link to={`/items/${it.id}`} className="mt-2 inline-block text-xs font-medium text-primary">View item →</Link>
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
