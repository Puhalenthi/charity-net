import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, MapPin, MessageSquare, Bell, ListChecks, ImagePlus, LogOut, Settings, Users, LayoutTemplate } from 'lucide-react';
import type { SiteFooter as SiteFooterContent, SiteHeader } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { SiteLink } from '@/components/site/SiteLink';
import { useNotifications } from '@/hooks/useNotifications';
import { useInbox } from '@/hooks/useInbox';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const personNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Heart },
  { to: '/post', label: 'Post item', icon: ImagePlus },
  { to: '/charities', label: 'Charities', icon: MapPin },
  { to: '/my-items', label: 'My items', icon: ListChecks },
  { to: '/inbox', label: 'Chats', icon: MessageSquare },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

const charityNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Heart },
  { to: '/feed', label: 'Feed', icon: ListChecks },
  { to: '/map', label: 'Map', icon: MapPin },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/inbox', label: 'Chats', icon: MessageSquare },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

const adminNav: NavItem[] = [
  { to: '/admin/site', label: 'Site editor', icon: LayoutTemplate },
  { to: '/admin/approvals', label: 'Approvals', icon: ListChecks },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export function AppLayout() {
  const { user, claims, signOut } = useAuth();
  const site = useSiteContent();
  const navigate = useNavigate();
  const location = useLocation();
  const { unread: alertCount } = useNotifications();
  const threads = useInbox();
  const chatCount = user ? threads.reduce((sum, t) => sum + (t.unread[user.uid] ?? 0), 0) : 0;

  const nav =
    claims?.role === 'admin' ? adminNav : claims?.role === 'charity' ? charityNav : personNav;

  const badgeFor = (to: string): number =>
    to === '/notifications' ? alertCount : to === '/inbox' ? chatCount : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BrandMark header={site.header} />
            <span className="hidden sm:inline">{site.header.brandName}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {user &&
              nav.map((n) => {
                const Icon = n.icon;
                const active = location.pathname === n.to;
                const badge = badgeFor(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      'relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/70',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                    {badge > 0 && (
                      <span className="ml-0.5 grid min-w-[1.25rem] place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
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
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/settings" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
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
              <SignedOutActions header={site.header} />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Animate in per top-level section (e.g. "/inbox"), NOT per full path —
            otherwise sub-navigation like /inbox → /inbox/:id would remount the
            whole subtree and thrash its Firestore listeners. */}
        <div
          key={location.pathname.split('/')[1] || 'home'}
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <Outlet />
        </div>
      </main>

      {/* The site editor is a full-height workspace with its own footer preview. */}
      {!location.pathname.startsWith('/admin/site') && <SiteFooter header={site.header} footer={site.footer} />}

      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden sticky bottom-0 z-30 border-t bg-background">
          <div className="grid grid-cols-5">
            {nav.slice(0, 5).map((n) => {
              const Icon = n.icon;
              const active = location.pathname === n.to;
              const badge = badgeFor(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    'relative flex flex-col items-center gap-1 py-3 text-xs',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                  {badge > 0 && (
                    <span className="absolute right-[22%] top-2 grid min-w-[1.1rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-tight text-primary-foreground">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function BrandMark({ header, small }: { header: SiteHeader; small?: boolean }) {
  const box = small ? 'h-7 w-7' : 'h-8 w-8';
  if (header.logoUrl) {
    return <img src={header.logoUrl} alt="" className={cn(box, 'rounded-md object-contain')} />;
  }
  return (
    <span className={cn(box, 'grid place-items-center rounded-md bg-primary text-primary-foreground')}>
      <Heart className="h-4 w-4" />
    </span>
  );
}

/** Header buttons for signed-out visitors (also shown in the editor preview). */
export function SignedOutActions({ header }: { header: SiteHeader }) {
  return (
    <>
      <SiteLink href="/explore" className={buttonVariants({ variant: 'ghost' })}>
        <MapPin className="h-4 w-4" />
        <span className="hidden sm:inline">Map</span>
        <span className="sr-only sm:hidden">Map of charities and items</span>
      </SiteLink>
      <SiteLink href="/login" className={buttonVariants({ variant: 'ghost' })}>
        Sign in
      </SiteLink>
      {header.cta.label && (
        <SiteLink href={header.cta.href} className={buttonVariants({ variant: 'sun' })}>
          {header.cta.label}
        </SiteLink>
      )}
    </>
  );
}

export function SiteFooter({ header, footer }: { header: SiteHeader; footer: SiteFooterContent }) {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark header={header} small />
            {header.brandName}
          </div>
          {footer.blurb && <p className="mt-3 text-sm text-muted-foreground">{footer.blurb}</p>}
        </div>
        {footer.links.length > 0 && (
          <nav className="flex flex-col gap-2 text-sm">
            {footer.linksTitle && <span className="font-semibold">{footer.linksTitle}</span>}
            {footer.links.map((l) => (
              <SiteLink key={l.id} href={l.href} className="text-muted-foreground hover:text-foreground">
                {l.label}
              </SiteLink>
            ))}
          </nav>
        )}
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {footer.copyright}
        </div>
      </div>
    </footer>
  );
}
