import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@charity-net/shared';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { authErrorMessage } from '@/lib/authErrors';

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

      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  // Google-only accounts have no password to change.
  const hasPassword = firebaseUser?.providerData.some((p) => p.providerId === 'password');
  if (!firebaseUser || !hasPassword) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast({ title: 'New password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (next !== confirm) {
      toast({ title: "New passwords don't match", variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Firebase requires a fresh sign-in before a password change, so verify
      // the current password first.
      await reauthenticateWithCredential(
        firebaseUser!,
        EmailAuthProvider.credential(firebaseUser!.email!, current),
      );
      await updatePassword(firebaseUser!, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({ title: 'Password changed', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not change password', description: authErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Repeat new password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? 'Changing…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
