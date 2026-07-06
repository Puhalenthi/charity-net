import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// A segmented Sign in / Sign up switcher so it's always obvious which mode the
// form is in. `active` marks the current page.
export function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  const base =
    'flex-1 rounded-md py-2 text-center text-sm font-medium transition-colors';
  const on = 'bg-background text-foreground shadow-sm';
  const off = 'text-muted-foreground hover:text-foreground';
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <Link to="/login" className={cn(base, active === 'login' ? on : off)}>
        Sign in
      </Link>
      <Link to="/signup" className={cn(base, active === 'signup' ? on : off)}>
        Sign up
      </Link>
    </div>
  );
}
