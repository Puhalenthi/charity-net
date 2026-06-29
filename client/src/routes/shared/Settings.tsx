import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
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
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose how Charity Net looks to you.</p>
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-1">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex flex-col items-center justify-center gap-1.5 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search radius</CardTitle>
        </CardHeader>
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
    </div>
  );
}
