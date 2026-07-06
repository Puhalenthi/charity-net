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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/Reveal';
import { Shot } from '@/components/Shot';
import { AnimatedNumber } from '@/components/AnimatedNumber';

const PHOTO = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const CATEGORIES = [
  'Sofas', 'Winter coats', 'Books', 'Cookware', 'Toys', 'Bikes',
  'Desks', 'Blankets', 'Laptops', 'Prams', 'Lamps', 'Guitars',
];

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">
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
            Everything you<br />give,<span className="text-gradient"> reimagined.</span>
          </Reveal>
          <Reveal as="p" delay={160} className="max-w-xl text-lg text-white/70">
            Snap a photo of something you no longer need. Nearby charities see it on a live map and
            reserve a pickup in seconds. No selling, no shipping — just a beautifully simple way to
            do some good.
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
  const row = [...CATEGORIES, ...CATEGORIES];
  return (
    <section className="border-y bg-muted/30 py-6">
      <div className="marquee overflow-hidden">
        <div className="marquee-track gap-3">
          {row.map((c, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground">
              {c}
            </span>
          ))}
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
    body: 'One photo is all it takes. Our AI reads the item, tags it, and checks it’s safe to share — before you even finish typing a title.',
    photo: PHOTO('photo-1555041469-a586c61ea9bc'),
    gradient: 'from-primary/30 to-sky-400/20',
    icon: ImagePlus,
  },
  {
    n: '02',
    title: 'Matched, locally.',
    body: 'Nearby charities get an instant alert when your item fits their wishlist. They see it on a map and reserve a pickup window.',
    photo: PHOTO('photo-1441986300917-64674bd600d8'),
    gradient: 'from-fuchsia-400/25 to-primary/20',
    icon: MapPin,
  },
  {
    n: '03',
    title: 'Handed over.',
    body: 'Chat to arrange the details, hand it off, and watch something you no longer needed change someone’s week.',
    photo: PHOTO('photo-1523381210434-271e8be1f52b'),
    gradient: 'from-amber-300/25 to-primary/20',
    icon: Heart,
  },
];

function HowItWorks() {
  return (
    <section className="container space-y-24 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Good, made effortless.</h2>
        <p className="mt-4 text-lg text-muted-foreground">Three taps from clutter to community.</p>
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
const FEATURES = [
  { icon: ImagePlus, title: 'Post in seconds', body: 'A photo, a tap, and your item is in front of nearby charities.' },
  { icon: MapPin, title: 'Live local map', body: 'See who’s nearby and exactly what they’re looking for right now.' },
  { icon: Sparkles, title: 'Smart matching', body: 'AI scans your photos and matches them to real charity wishlists.' },
  { icon: MessageCircle, title: 'Direct chat', body: 'Coordinate pickup right inside the app — no numbers to swap.' },
  { icon: Recycle, title: 'Zero waste', body: 'Keep usable things out of landfill and in loving hands.' },
  { icon: ShieldCheck, title: 'Safe & vetted', body: 'Every charity is admin-approved and image safety is automatic.' },
];

function Features() {
  return (
    <section className="container py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Designed to feel invisible.</h2>
        <p className="mt-4 text-lg text-muted-foreground">Everything you need, nothing you don’t.</p>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} variant="up" delay={(i % 3) * 90}>
            <div className="group h-full rounded-3xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
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
            Your clutter is someone’s <span className="text-gradient">lifeline.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Join thousands turning spare things into real help — in the time it takes to take a photo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="group">
              <Link to="/signup">
                Get started free
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
