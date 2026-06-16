import { Link } from 'react-router-dom';
import { Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div>
      <section className="container py-16 sm:py-24 grid gap-10 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Give items a second life
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Connecting people, charities, and the world.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Snap a photo of something you don't need anymore. Nearby charities see it on a map and
            reserve a pickup. No selling, no shipping — just a clean way to do some good.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Start giving</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">I run a charity</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Feature icon={Heart} title="Post in seconds" body="A photo, a tap, and an item is in front of nearby charities." />
          <Feature icon={MapPin} title="Local map" body="See who is nearby and what they're looking for." />
          <Feature icon={Sparkles} title="Smart matching" body="AI scans your photos and matches them to wishlists." />
          <Feature icon={MessageCircle} title="Direct chat" body="Coordinate pickup right inside the app." />
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-accent/40">
      <CardContent className="p-5 space-y-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
