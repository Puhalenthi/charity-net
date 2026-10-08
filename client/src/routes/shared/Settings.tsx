import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import {
  ApiError,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
  USERNAME_RE,
  toLoginEmail,
  usernameFromEmail,
} from '@charity-net/shared';
import { getApi } from '@/lib/api';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { authErrorMessage } from '@/lib/authErrors';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const { user, claims, refresh } = useAuth();
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
          <p className="text-sm text-muted-foreground">Choose how Storage Auction Connect looks to you.</p>
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

      {claims?.role === 'admin' && <AdminLoginCard />}
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const { firebaseUser, user, refresh } = useAuth();
  const usingDefault = Boolean((user as { defaultPassword?: boolean } | null)?.defaultPassword);
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
      if (usingDefault && user) {
        await updateDoc(doc(db, 'users', user.uid), { defaultPassword: false, updatedAt: Date.now() });
        await refresh();
      }
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
        {usingDefault && (
          <p className="mb-3 rounded-md bg-sun/15 px-3 py-2 text-sm">
            You're still using the default password. Pick your own so nobody else can sign in.
          </p>
        )}
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

/** Admins sign in with a username (stored as a synthetic email); rename it here. */
function AdminLoginCard() {
  const { firebaseUser, refresh } = useAuth();
  const { toast } = useToast();
  const currentUsername = usernameFromEmail(firebaseUser?.email);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!firebaseUser) return null;
  const normalized = username.trim().toLowerCase();
  const valid = USERNAME_RE.test(normalized);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast({ title: 'Usernames are 3–32 letters, numbers, dots, dashes or underscores', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // The server only allows this right after a fresh sign-in.
      await reauthenticateWithCredential(
        firebaseUser!,
        EmailAuthProvider.credential(firebaseUser!.email!, password),
      );
      await firebaseUser!.getIdToken(true);
      await getApi().adminSetUsername({ username: normalized });
      // Changing the email invalidates nothing server-side, but the local
      // credential is now stale — sign in again quietly with the new name.
      await signInWithEmailAndPassword(auth, toLoginEmail(normalized), password);
      await refresh();
      setUsername('');
      setPassword('');
      toast({ title: 'Username changed', description: `Sign in as “${normalized}” from now on.`, variant: 'success' });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === 'username_taken'
            ? 'That username is already in use.'
            : err.message
          : authErrorMessage(err);
      toast({ title: 'Could not change username', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin sign-in</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          {currentUsername ? (
            <>You sign in with the username <span className="font-semibold text-foreground">{currentUsername}</span>.</>
          ) : (
            <>You sign in with <span className="font-semibold text-foreground">{firebaseUser.email}</span>. Set a username to sign in with that instead.</>
          )}
        </p>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="new-username">New username</Label>
              <Input
                id="new-username"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="username-password">Current password</Label>
              <PasswordInput
                id="username-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {username && !valid && (
            <p className="text-xs text-destructive">3–32 characters: letters, numbers, dot, dash or underscore.</p>
          )}
          <Button type="submit" disabled={saving || !valid || !password}>
            {saving ? 'Changing…' : 'Change username'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
