import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Package } from 'lucide-react';
import type { PublicMapCharity, PublicMapItem } from '@charity-net/shared';
import { getApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MapView, type MapPin } from '@/components/map/MapView';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tab = 'charities' | 'items';

// Public map for visitors who aren't signed in. Data comes from
// /api/public/map, which only exposes approved charities and active items
// with item locations already fuzzed server-side.
export function ExploreMapPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('charities');
  const [data, setData] = useState<{ charities: PublicMapCharity[]; items: PublicMapItem[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getApi()
      .publicMap()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const charityById = useMemo(() => new Map(data?.charities.map((c) => [c.id, c]) ?? []), [data]);
  const itemById = useMemo(() => new Map(data?.items.map((i) => [i.id, i]) ?? []), [data]);

  const pins: MapPin[] = useMemo(() => {
    if (!data) return [];
    return tab === 'charities'
      ? data.charities.map((c) => ({ id: c.id, position: { lat: c.lat, lng: c.lng }, title: c.name }))
      : data.items.map((i) => ({ id: i.id, position: { lat: i.lat, lng: i.lng }, title: i.title }));
  }, [data, tab]);

  const joinHref = user ? '/' : '/signup';

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore the map</h1>
          <p className="text-muted-foreground">
            Partner charities and items currently waiting for a new home.
          </p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist">
          {(
            [
              { value: 'charities', label: 'Charities', icon: HeartHandshake, count: data?.charities.length },
              { value: 'items', label: 'Items', icon: Package, count: data?.items.length },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium',
                tab === t.value
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && <span className="text-xs text-muted-foreground">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="grid place-items-center h-64 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          The map couldn't be loaded. Please try again in a moment.
        </div>
      ) : (
        <MapView
          pins={pins}
          renderPopup={(id) => {
            if (tab === 'charities') {
              const c = charityById.get(id);
              if (!c) return null;
              return (
                <div className="p-1 max-w-[240px]">
                  <div className="flex items-center gap-2">
                    {c.logoUrl && <img src={c.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      {c.city && <div className="text-xs text-muted-foreground">{c.city}</div>}
                    </div>
                  </div>
                  {c.categoriesAccepted.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.categoriesAccepted.slice(0, 4).map((cat) => (
                        <Badge key={cat} variant="secondary">{cat}</Badge>
                      ))}
                    </div>
                  )}
                  {c.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{c.description}</p>
                  )}
                  <div className="mt-2">
                    <Link to={joinHref} className="text-primary text-xs font-medium">
                      {user ? 'Go to your dashboard →' : 'Sign up to donate →'}
                    </Link>
                  </div>
                </div>
              );
            }
            const it = itemById.get(id);
            if (!it) return null;
            return (
              <div className="p-1 max-w-[220px]">
                {it.photoUrl && (
                  <img src={it.photoUrl} alt={it.title} className="mb-2 aspect-[4/3] w-full rounded object-cover" />
                )}
                <div className="font-semibold">{it.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {it.category && <Badge variant="secondary">{it.category}</Badge>}
                  {it.city && <span>{it.city}</span>}
                </div>
                <div className="mt-2">
                  <Link to={joinHref} className="text-primary text-xs font-medium">
                    {user ? 'Go to your dashboard →' : 'Sign up as a charity to claim →'}
                  </Link>
                </div>
              </div>
            );
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Item locations are approximate to protect donors' privacy.
      </p>
    </div>
  );
}
