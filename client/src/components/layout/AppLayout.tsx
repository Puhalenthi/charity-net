import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Inbox, Bell, User2, ListChecks, ImagePlus, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const personNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Heart },
  { to: '/post', label: 'Post item', icon: ImagePlus },
  { to: '/charities', label: 'Charities', icon: MapPin },
  { to: '/my-items', label: 'My items', icon: ListChecks },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

const charityNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Heart },
  { to: '/feed', label: 'Feed', icon: ListChecks },
  { to: '/map', label: 'Map', icon: MapPin },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

const adminNav: NavItem[] = [{ to: '/admin/approvals', label: 'Approvals', icon: ListChecks }];

export function AppLayout() {
  const { user, claims, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const nav =
    claims?.role === 'admin' ? adminNav : claims?.role === 'charity' ? charityNav : personNav;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Charity Net</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {user &&
              nav.map((n) => {
                const Icon = n.icon;
                const active = location.pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/70',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    {user.photoURL ? <AvatarImage src={user.photoURL} alt={user.displayName} /> : null}
                    <AvatarFallback>{initials(user.displayName ?? 'U')}</AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm">{user.displayName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden sticky bottom-0 z-30 border-t bg-background">
          <div className="grid grid-cols-5">
            {nav.slice(0, 5).map((n) => {
              const Icon = n.icon;
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 text-xs',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
