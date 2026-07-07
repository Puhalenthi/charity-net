import { useMemo, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ApiError, type AdminCharityRecord, type AdminUserRecord } from '@charity-net/shared';
import { KeyRound, Lock, Search } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { getApi } from '@/lib/api';
import { authErrorMessage } from '@/lib/authErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type Directory = { users: AdminUserRecord[]; charities: AdminCharityRecord[] };

export function AdminUsersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Directory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  async function loadDirectory() {
    const d = await getApi().adminUsers();
    setData(d);
  }

  // The server rejects these endpoints unless the admin signed in again within
  // the last few minutes, so a stale unlock gets caught even if the UI let it by.
  function handleGateExpired(err: unknown): boolean {
    if (err instanceof ApiError && err.code === 'recent_login_required') {
      setModalOpen(true);
      toast({
        title: 'Please confirm your password again',
        description: 'The unlock only lasts a few minutes.',
      });
      return true;
    }
    return false;
  }

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter((u) =>
      [u.email, u.displayName, u.charityName, u.role].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  if (!data) {
    return (
      <div className="container py-6 max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Users &amp; charities</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div className="max-w-sm space-y-1">
              <p className="font-medium">This area is locked</p>
              <p className="text-sm text-muted-foreground">
                It lists every account on the platform, so you need to enter your
                password again before it opens.
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>Enter password</Button>
          </CardContent>
        </Card>
        <ReauthModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onUnlocked={async () => {
            await loadDirectory();
            setModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users &amp; charities</h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts"
            className="w-64 pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Firebase stores passwords one-way encrypted, so an existing password can
            never be read back, not even here. You can set a new one instead; it
            takes effect right away and signs that person out everywhere.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Account</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Sign-in</th>
                  <th className="py-2 pr-4 font-medium">Last active</th>
                  <th className="py-2 font-medium">Password</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <UserRow key={u.uid} user={u} onGateExpired={handleGateExpired} />
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No accounts match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Charities ({data.charities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Charity</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 font-medium">City</th>
                </tr>
              </thead>
              <tbody>
                {data.charities.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{c.ownerEmail ?? c.ownerUid}</td>
                    <td className="py-2.5 text-muted-foreground">{c.city ?? '–'}</td>
                  </tr>
                ))}
                {data.charities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No charities yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReauthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUnlocked={async () => {
          await loadDirectory();
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function UserRow({
  user,
  onGateExpired,
}: {
  user: AdminUserRecord;
  onGateExpired: (err: unknown) => boolean;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const passwordProvider = user.providers.includes('password');

  async function save() {
    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await getApi().adminSetUserPassword(user.uid, { password: newPassword });
      toast({ title: 'Password updated', description: user.email ?? user.uid, variant: 'success' });
      setEditing(false);
      setNewPassword('');
    } catch (err) {
      if (!onGateExpired(err)) {
        toast({ title: 'Could not set password', description: (err as Error).message, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b align-top last:border-0">
      <td className="py-2.5 pr-4">
        <div className="font-medium">{user.displayName ?? '(no name)'}</div>
        <div className="text-xs text-muted-foreground">{user.email ?? user.uid}</div>
      </td>
      <td className="py-2.5 pr-4">
        <span className="capitalize">{user.role}</span>
        {user.charityName && (
          <div className="text-xs text-muted-foreground">{user.charityName}</div>
        )}
        {!user.hasProfile && (
          <div className="text-xs text-amber-600 dark:text-amber-400">signup unfinished</div>
        )}
      </td>
      <td className="py-2.5 pr-4 text-muted-foreground">
        {user.providers.length ? user.providers.map((p) => (p === 'password' ? 'email' : p.replace('.com', ''))).join(', ') : '–'}
      </td>
      <td className="py-2.5 pr-4 text-muted-foreground">
        {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'never'}
      </td>
      <td className="py-2.5">
        {passwordProvider ? (
          editing ? (
            <div className="flex items-center gap-2">
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="h-8 w-40"
                autoFocus
              />
              <Button size="sm" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNewPassword(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground" title="Stored one-way encrypted">
                ••••••••
              </span>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <KeyRound className="h-3.5 w-3.5" />
                Set new
              </Button>
            </div>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Google account</span>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        status === 'approved' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        status === 'pending' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        status === 'rejected' && 'bg-red-500/15 text-red-600 dark:text-red-400',
        !['approved', 'pending', 'rejected'].includes(status) && 'bg-muted text-muted-foreground',
      )}
    >
      {status}
    </span>
  );
}

/** Password confirmation in its own window-style overlay. Reauthentication
 * refreshes the token's auth_time, which the server checks on every call. */
function ReauthModal({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fbUser = auth.currentUser;
    if (!fbUser?.email) {
      toast({ title: 'No signed-in email account', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, password));
      // Pull a fresh token so the server sees the new auth_time.
      await fbUser.getIdToken(true);
      await onUnlocked();
      setPassword('');
    } catch (err) {
      toast({ title: 'Could not verify', description: authErrorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-4 w-4" /> Confirm it's you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter your password to view account details. The unlock lasts five minutes.
            </p>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !password}>
                {busy ? 'Checking…' : 'Unlock'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
