import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, ListChecks, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function CharityHome() {
  const { charity, user } = useAuth();
  return (
    <div className="container py-6 sm:py-8 space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/40 p-6 sm:p-10 border">
        <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {charity?.name ?? user?.displayName}.</h1>
        <p className="text-muted-foreground mt-1 max-w-xl">
          See what's available nearby, set what you're looking for, and message givers directly.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button asChild size="lg"><Link to="/feed"><ListChecks className="mr-2 h-4 w-4" /> Browse feed</Link></Button>
          <Button asChild variant="outline" size="lg"><Link to="/map"><MapPin className="mr-2 h-4 w-4" /> Open map</Link></Button>
          <Button asChild variant="outline" size="lg"><Link to="/wishlist"><Heart className="mr-2 h-4 w-4" /> Edit wishlist</Link></Button>
        </div>
      </div>
    </div>
  );
}
