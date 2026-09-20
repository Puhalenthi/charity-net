import { Link } from 'react-router-dom';
import { Camera, MapPin, MessageCircle, ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

// Real donated items, shot by neighbours. Served from client/public/photos.
const GALLERY = [
  { src: '/photos/m4.webp', title: 'Patterned 3-seat sofa', place: 'Teaneck' },
  { src: '/photos/m2.webp', title: "Kids' cruiser bike", place: 'Ridgewood' },
  { src: '/photos/m1.webp', title: 'Queen bed with mattress', place: 'Hackensack' },
  { src: '/photos/m6.webp', title: 'Tall floor lamp', place: 'Fort Lee' },
  { src: '/photos/m5.webp', title: 'Round glass side table', place: 'Englewood' },
  { src: '/photos/m3.webp', title: 'Grey sofa bed', place: 'Paramus' },
];

const CATEGORIES = [
  'Furniture', 'Appliances', 'Housewares', 'Books', 'Clothing',
  'Toys', 'Bikes', 'Lamps', 'Kitchen', 'Building materials',
];

export function LandingPage() {
  const { firebaseUser, user, profileStatus } = useAuth();
  // Signed in but onboarding never finished: offer the way back in without
  // hijacking the page (HomeRouter deliberately no longer force-redirects).
  const showFinishSignup = Boolean(firebaseUser) && !user && profileStatus === 'missing';
  return (
    <div>
      {showFinishSignup && (
        <div className="border-b bg-sun/15 px-4 py-2.5 text-center text-sm">
          You're signed in but your account isn't set up yet.{' '}
          <Link to="/complete-signup" className="font-semibold text-primary underline underline-offset-2">
            Finish signup
          </Link>
        </div>
      )}
      <Hero />
      <HowItWorks />
      <Gallery />
      <Categories />
      <Stats />
      <FinalCta />
    </div>
  );
}

/* ----------------------------- Hero ----------------------------- */
function Hero() {
  return (
    <section className="border-b bg-secondary/50">
      <div className="container grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            A neighbourhood reuse network
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Good stuff, passed on to people who need it.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Got a sofa, a bike, or a box of things you no longer use? Take a photo and
            local charities can claim it and pick it up. It's free, and nothing ends up in
            a landfill.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="sun">
              <Link to="/signup">Give an item</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">I run a charity</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Already here?{' '}
            <Link to="/login" className="font-medium text-primary underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <img
              src="/photos/m4.webp"
              alt="A donated patterned sofa ready for pickup"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-4 left-4 rounded-lg border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-sun" />
              Free · pickup nearby
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- How it works ------------------------- */
const STEPS = [
  {
    icon: Camera,
    title: 'Take a photo',
    body: 'Snap the item you want to give away. A short description helps, but the photo does most of the work.',
  },
  {
    icon: MapPin,
    title: 'A charity nearby claims it',
    body: 'Charities in your area see what you posted and reserve the things they can use.',
  },
  {
    icon: MessageCircle,
    title: 'Arrange the pickup',
    body: 'Message inside the app to sort out a time. They come and collect it. Done.',
  },
];

function HowItWorks() {
  return (
    <section className="container py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
        <p className="mt-3 text-lg text-muted-foreground">Three steps from your spare room to someone who needs it.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- Gallery --------------------------- */
function Gallery() {
  return (
    <section className="border-y bg-secondary/40 py-16 sm:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Recently given</h2>
            <p className="mt-3 text-lg text-muted-foreground">Real things neighbours have passed on lately.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/signup">
              Post yours
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((g) => (
            <div key={g.src} className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <img src={g.src} alt={g.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-4">
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {g.place}
                  </div>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  Free
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Categories -------------------------- */
function Categories() {
  return (
    <section className="container py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold sm:text-4xl">What people give</h2>
        <p className="mt-3 text-lg text-muted-foreground">Almost anything usable finds a home. A few of the regulars:</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-2.5">
        {CATEGORIES.map((c) => (
          <span key={c} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- Stats ----------------------------- */
const STATS = [
  { value: '12,000+', label: 'Items rehomed' },
  { value: '340', label: 'Local charities' },
  { value: '28', label: 'Towns covered' },
  { value: '48h', label: 'Typical pickup time' },
];

function Stats() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container grid grid-cols-2 gap-8 py-14 text-center lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-4xl font-bold sm:text-5xl">{s.value}</div>
            <div className="mt-2 text-sm text-primary-foreground/75">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Final CTA -------------------------- */
function FinalCta() {
  return (
    <section className="container py-16 sm:py-24">
      <div className="rounded-lg border bg-secondary/50 px-6 py-14 text-center sm:px-10">
        <Heart className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold sm:text-4xl">
          Have something to give?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-lg text-muted-foreground">
          Posting takes about a minute. That's usually all it takes to find it a better home.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="sun">
            <Link to="/signup">Give an item</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
