import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  ImagePlus,
  ArrowRight,
  ChevronDown,
  Recycle,
  ShieldCheck,
  Armchair,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/Reveal';
import { Shot } from '@/components/Shot';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { useAuth } from '@/lib/auth';

const PHOTO = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const CATEGORIES = [
  'Sofas', 'Winter coats', 'Books', 'Cookware', 'Toys', 'Bikes',
  'Desks', 'Blankets', 'Laptops', 'Prams', 'Lamps', 'Guitars',
];

export function LandingPage() {
  const { firebaseUser, user, profileStatus } = useAuth();
  // Signed in but onboarding never finished: offer the way back in without
  // hijacking the page (HomeRouter deliberately no longer force-redirects).
  const showFinishSignup = Boolean(firebaseUser) && !user && profileStatus === 'missing';
  return (
    <div className="overflow-x-hidden">
      {showFinishSignup && (
        <div className="border-b bg-primary/10 px-4 py-2.5 text-center text-sm">
          You're signed in but your account isn't set up yet.{' '}
          <Link to="/complete-signup" className="font-semibold text-primary underline underline-offset-2">
            Finish signup
          </Link>
        </div>
      )}
      <Hero />
      <Marquee />
      <HowItWorks />
      <Stats />
      <Features />
      <FinalCta />
    </div>
  );
}

/* ----------------------------- Hero ----------------------------- */
function Hero() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent) {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    setTilt({
      x: (e.clientX - (r.left + r.width / 2)) / r.width,
      y: (e.clientY - (r.top + r.height / 2)) / r.height,
    });
  }

  const p = (depth: number) => ({
    transform: `translate3d(${tilt.x * depth}px, ${tilt.y * depth}px, 0)`,
  });

  return (
    <section
      ref={stageRef}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative isolate overflow-hidden bg-[#05070d] text-white"
    >
      <div className="aurora absolute inset-0 -z-10 opacity-90" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent,#05070d_75%)]" />

      <div className="container grid min-h-[92vh] items-center gap-12 py-24 lg:grid-cols-2">
        <div className="space-y-7">
          <Reveal variant="up" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Give items a second life
          </Reveal>
          <Reveal as="h1" delay={80} className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Stuff you don't need.<br /><span className="text-gradient">People who do.</span>
          </Reveal>
          <Reveal as="p" delay={160} className="max-w-xl text-lg text-white/70">
            Take a photo of something you no longer use. Charities near you see it on a live map
            and claim it for pickup. Nothing to sell and nothing to ship.
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/signup">
                Start giving
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/signup">I run a charity</Link>
            </Button>
          </Reveal>
        </div>

        {/* Floating app-preview cards with mouse parallax */}
        <div className="relative h-[420px] sm:h-[520px]">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40 blur-[90px]" />

          <FloatCard style={p(-26)} className="left-2 top-4 w-60 rotate-[-6deg] animate-float">
            <MiniHeader icon={ImagePlus} title="Post in seconds" />
            <div className="mt-3 h-24 rounded-xl bg-gradient-to-br from-primary/40 to-sky-400/30" />
            <p className="mt-3 text-sm text-white/70">Beige fabric sofa · Berlin</p>
          </FloatCard>

          <FloatCard style={p(24)} className="right-0 top-20 w-56 rotate-[5deg] animate-float-slow">
            <MiniHeader icon={MapPin} title="Nearby charities" />
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-white/10" />
              ))}
            </div>
          </FloatCard>

          <FloatCard style={p(40)} className="bottom-2 left-10 w-64 rotate-[3deg] animate-float">
            <MiniHeader icon={MessageCircle} title="Direct chat" />
            <div className="mt-3 space-y-1.5">
              <div className="ml-auto w-3/4 rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-xs">Can we pick it up Saturday?</div>
              <div className="w-2/3 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-xs">Perfect, see you then 👋</div>
            </div>
          </FloatCard>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <ChevronDown className="h-6 w-6 animate-bob text-white/50" />
      </div>
    </section>
  );
}

function FloatCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`glass absolute rounded-3xl border border-white/15 p-4 shadow-2xl ${className ?? ''}`}>
      {children}
    </div>
  );
}

function MiniHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

/* --------------------------- Marquee ---------------------------- */
function Marquee() {
  // Two identical copies; the track animates exactly -50% (one copy's width),
  // so the loop restart is pixel-identical — no visible snap. Each copy carries
  // its own trailing gap (pr-3) so the seam between copies matches the gap-3
  // spacing inside them.
  const copy = (hidden: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0 items-center gap-3 pr-3">
      {CATEGORIES.map((c) => (
        <span
          key={c}
          className="whitespace-nowrap rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
        >
          {c}
        </span>
      ))}
    </div>
  );
  return (
    <section className="border-y bg-muted/30 py-6">
      <div className="marquee overflow-hidden">
        <div className="marquee-track">
          {copy(false)}
          {copy(true)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- How it works ------------------------- */
const STEPS = [
  {
    n: '01',
    title: 'Snap it.',
    body: 'One photo is enough. The app works out what the item is, tags it, and checks that it is safe to share before it goes live.',
    photo: PHOTO('photo-1555041469-a586c61ea9bc'),
    gradient: 'from-primary/30 to-sky-400/20',
    icon: ImagePlus,
  },
  {
    n: '02',
    title: 'Matched nearby.',
    body: 'Charities close to you get an alert when your item fits something on their wishlist. They see it on a map and reserve a pickup window.',
    photo: PHOTO('photo-1441986300917-64674bd600d8'),
    gradient: 'from-fuchsia-400/25 to-primary/20',
    icon: MapPin,
  },
  {
    n: '03',
    title: 'Handed over.',
    body: 'Chat to sort out timing, hand the item over, and it goes straight to someone who can use it.',
    photo: PHOTO('photo-1523381210434-271e8be1f52b'),
    gradient: 'from-amber-300/25 to-primary/20',
    icon: Heart,
  },
];

function HowItWorks() {
  return (
    <section className="container space-y-24 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">How it works</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          From your spare room to a charity van in three steps.
        </p>
      </Reveal>

      {STEPS.map((s, i) => (
        <div key={s.n} className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal
            variant={i % 2 === 0 ? 'left' : 'right'}
            className={i % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}
          >
            <Shot src={s.photo} alt={s.title} gradient={s.gradient} icon={s.icon} className="aspect-[4/3] w-full animate-float-slow" />
          </Reveal>
          <Reveal
            variant={i % 2 === 0 ? 'right' : 'left'}
            delay={100}
            className={i % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}
          >
            <div className="text-sm font-semibold text-primary">{s.n}</div>
            <h3 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h3>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">{s.body}</p>
          </Reveal>
        </div>
      ))}
    </section>
  );
}

/* ---------------------------- Stats ----------------------------- */
const STATS = [
  { value: 12480, suffix: '+', label: 'Items rehomed' },
  { value: 340, suffix: '', label: 'Local charities' },
  { value: 28, suffix: '', label: 'Cities' },
  { value: 96, suffix: '%', label: 'Picked up in 48h' },
];

function Stats() {
  return (
    <section className="relative isolate overflow-hidden bg-[#05070d] py-24 text-white">
      <div className="aurora absolute inset-0 -z-10 opacity-60" />
      <div className="container grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} variant="scale" delay={i * 90}>
            <div className="text-5xl font-bold tracking-tight sm:text-6xl">
              <AnimatedNumber value={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm text-white/60">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Features --------------------------- */

/* Little in-card mockups, in the same style as the hero's floating cards. */
function PostVisual() {
  return (
    <div className="flex h-full gap-2.5">
      <div className="grid aspect-square h-full place-items-center rounded-lg bg-gradient-to-br from-primary/40 to-sky-400/30 text-primary">
        <ImagePlus className="h-5 w-5 opacity-70" />
      </div>
      <div className="flex-1 space-y-1.5 py-1">
        <div className="h-2 w-3/4 rounded bg-foreground/15" />
        <div className="h-2 w-1/2 rounded bg-foreground/10" />
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3" /> Live
        </span>
      </div>
    </div>
  );
}

function MapVisual() {
  return (
    <div className="relative grid h-full grid-cols-4 gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-md bg-foreground/[0.06]" />
      ))}
      <span className="absolute left-[30%] top-[35%] h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/25" />
      <span className="absolute left-[62%] top-[60%] h-2.5 w-2.5 rounded-full bg-[#ea4335] ring-4 ring-[#ea4335]/25" />
      <span className="absolute left-[75%] top-[22%] h-2 w-2 rounded-full bg-[#a855f7] ring-4 ring-[#a855f7]/25" />
    </div>
  );
}

function MatchVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full border bg-background px-2.5 py-1 font-medium">Winter coat</span>
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground">Warm clothing</span>
      </div>
      <div className="text-[10px] text-muted-foreground">Matched to a wishlist 1.2 km away</div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 text-xs">
      <div className="ml-auto w-3/4 rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground">
        Saturday at 10 works!
      </div>
      <div className="w-2/3 rounded-2xl rounded-bl-sm bg-foreground/10 px-3 py-1.5">See you then 👋</div>
    </div>
  );
}

function WasteVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
      <Armchair className="h-6 w-6" />
      <ArrowRight className="h-4 w-4 text-primary" />
      <Recycle className="h-6 w-6" />
      <ArrowRight className="h-4 w-4 text-primary" />
      <Heart className="h-6 w-6 text-primary" />
    </div>
  );
}

function VettedVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Charity verified by an admin
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Photo checks passed
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: ImagePlus,
    title: 'Post in seconds',
    body: 'Take a photo and your item is live for charities near you.',
    visual: PostVisual,
  },
  {
    icon: MapPin,
    title: 'Live local map',
    body: 'See which charities are around you and what they need.',
    visual: MapVisual,
  },
  {
    icon: Sparkles,
    title: 'Smart matching',
    body: 'Your photos are matched against real charity wishlists automatically.',
    visual: MatchVisual,
  },
  {
    icon: MessageCircle,
    title: 'Direct chat',
    body: 'Arrange pickup inside the app. You never share your phone number.',
    visual: ChatVisual,
  },
  {
    icon: Recycle,
    title: 'Zero waste',
    body: 'Usable things stay out of the landfill and go where they get used.',
    visual: WasteVisual,
  },
  {
    icon: ShieldCheck,
    title: 'Safe & vetted',
    body: 'Charities are checked by an admin before they can claim anything.',
    visual: VettedVisual,
  },
];

function Features() {
  return (
    <section className="container py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">What you get</h2>
        <p className="mt-4 text-lg text-muted-foreground">A short list of things that matter.</p>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} variant="up" delay={(i % 3) * 90}>
            <div className="group h-full rounded-3xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-xl hover:shadow-primary/10">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              <div className="mt-4 h-24 rounded-xl border bg-muted/40 p-3 transition-colors duration-300 group-hover:border-primary/20 group-hover:bg-muted/60">
                <f.visual />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Final CTA -------------------------- */
function FinalCta() {
  return (
    <section className="container pb-28">
      <Reveal variant="scale">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-[#05070d] px-8 py-20 text-center text-white">
          <div className="aurora absolute inset-0 -z-10 opacity-80" />
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Someone nearby can <span className="text-gradient">use it.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Posting an item takes about a minute. That is usually all it needs to find a better home.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/signup">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
