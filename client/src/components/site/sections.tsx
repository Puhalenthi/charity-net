import { useContext } from 'react';
import { ArrowRight, ImageIcon, MapPin } from 'lucide-react';
import type { SectionOf, SiteBackground, SiteImage, SiteSection } from '@charity-net/shared';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Paragraphs, SITE_ICON_COMPONENTS, SiteLink, SitePreviewContext } from './SiteLink';

// Public landing-page sections, rendered from Site editor content. The same
// components drive the editor's live preview, so what the admin sees is
// exactly what goes live.

export function SectionRenderer({ section }: { section: SiteSection }) {
  switch (section.type) {
    case 'hero':
      return <HeroSection s={section} />;
    case 'steps':
      return <StepsSection s={section} />;
    case 'gallery':
      return <GallerySection s={section} />;
    case 'chips':
      return <ChipsSection s={section} />;
    case 'stats':
      return <StatsSection s={section} />;
    case 'cta':
      return <CtaSection s={section} />;
    case 'textBlock':
      return <TextBlockSection s={section} />;
    case 'imageText':
      return <ImageTextSection s={section} />;
  }
}

function SiteImg({
  image,
  className,
  frameClassName,
  lazy,
}: {
  image: SiteImage;
  className?: string;
  /** Optional wrapper; dropped together with the image when there is none. */
  frameClassName?: string;
  lazy?: boolean;
}) {
  const preview = useContext(SitePreviewContext);
  let el: React.ReactNode;
  if (!image.url) {
    // Only the editor shows an empty slot; the live site just omits it.
    if (!preview) return null;
    el = (
      <div className={cn('grid place-items-center bg-muted text-muted-foreground', className)}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  } else {
    el = <img src={image.url} alt={image.alt} loading={lazy ? 'lazy' : undefined} className={className} />;
  }
  return frameClassName ? <div className={frameClassName}>{el}</div> : el;
}

const bgClass: Record<SiteBackground, string> = {
  plain: '',
  tinted: 'border-y bg-secondary/40',
  brand: 'bg-primary text-primary-foreground',
};

/* ----------------------------- Hero ----------------------------- */
function HeroSection({ s }: { s: SectionOf<'hero'> }) {
  return (
    <section className="border-b bg-secondary/50">
      <div className="container grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
        <div>
          {s.eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{s.eyebrow}</p>
          )}
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{s.title}</h1>
          <div className="mt-4 max-w-md space-y-3 text-lg text-muted-foreground">
            <Paragraphs text={s.body} />
          </div>
          {(s.primary.label || s.secondary.label) && (
            <div className="mt-7 flex flex-wrap gap-3">
              {s.primary.label && (
                <SiteLink href={s.primary.href} className={buttonVariants({ size: 'lg', variant: 'sun' })}>
                  {s.primary.label}
                </SiteLink>
              )}
              {s.secondary.label && (
                <SiteLink href={s.secondary.href} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                  {s.secondary.label}
                </SiteLink>
              )}
            </div>
          )}
          {s.showSignInHint && (
            <p className="mt-4 text-sm text-muted-foreground">
              Already here?{' '}
              <SiteLink href="/login" className="font-medium text-primary underline underline-offset-2">
                Sign in
              </SiteLink>
            </p>
          )}
        </div>

        <div className="relative">
          <SiteImg
            image={s.image}
            frameClassName="overflow-hidden rounded-lg border shadow-sm"
            className="aspect-[4/3] w-full object-cover"
          />
          {s.badge && (
            <div className="absolute -bottom-4 left-4 rounded-lg border bg-card px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-sun" />
                {s.badge}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="max-w-2xl">
      {title && <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>}
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ------------------------- How it works ------------------------- */
function StepsSection({ s }: { s: SectionOf<'steps'> }) {
  return (
    <section className="container py-16 sm:py-20">
      <SectionHeading title={s.title} subtitle={s.subtitle} />
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {s.steps.map((step, i) => {
          const Icon = SITE_ICON_COMPONENTS[step.icon];
          return (
            <div key={step.id} className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------- Gallery --------------------------- */
function GallerySection({ s }: { s: SectionOf<'gallery'> }) {
  return (
    <section className="border-y bg-secondary/40 py-16 sm:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading title={s.title} subtitle={s.subtitle} />
          {s.cta.label && (
            <SiteLink href={s.cta.href} className={buttonVariants({ variant: 'outline' })}>
              {s.cta.label}
              <ArrowRight className="h-4 w-4" />
            </SiteLink>
          )}
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <SiteImg image={g.image} lazy className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-4">
                <div>
                  <div className="font-semibold">{g.title}</div>
                  {g.place && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {g.place}
                    </div>
                  )}
                </div>
                {g.tag && (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    {g.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Categories -------------------------- */
function ChipsSection({ s }: { s: SectionOf<'chips'> }) {
  return (
    <section className="container py-16 sm:py-20">
      <SectionHeading title={s.title} subtitle={s.subtitle} />
      <div className="mt-8 flex flex-wrap gap-2.5">
        {s.chips.map((c) => (
          <span key={c.id} className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
            {c.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- Stats ----------------------------- */
function StatsSection({ s }: { s: SectionOf<'stats'> }) {
  const cols = Math.min(Math.max(s.items.length, 1), 4);
  return (
    <section className="bg-primary text-primary-foreground">
      <div
        className={cn(
          'container grid gap-8 py-14 text-center',
          cols === 1 ? 'grid-cols-1' : 'grid-cols-2',
          cols === 3 && 'lg:grid-cols-3',
          cols === 4 && 'lg:grid-cols-4',
        )}
      >
        {s.items.map((stat) => (
          <div key={stat.id}>
            <div className="text-4xl font-bold sm:text-5xl">{stat.value}</div>
            <div className="mt-2 text-sm text-primary-foreground/75">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Final CTA -------------------------- */
function CtaSection({ s }: { s: SectionOf<'cta'> }) {
  const Icon = SITE_ICON_COMPONENTS[s.icon];
  return (
    <section className="container py-16 sm:py-24">
      <div className="rounded-lg border bg-secondary/50 px-6 py-14 text-center sm:px-10">
        <Icon className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold sm:text-4xl">{s.title}</h2>
        {s.body && <p className="mx-auto mt-3 max-w-lg text-lg text-muted-foreground">{s.body}</p>}
        {(s.primary.label || s.secondary.label) && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {s.primary.label && (
              <SiteLink href={s.primary.href} className={buttonVariants({ size: 'lg', variant: 'sun' })}>
                {s.primary.label}
              </SiteLink>
            )}
            {s.secondary.label && (
              <SiteLink href={s.secondary.href} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                {s.secondary.label}
              </SiteLink>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* --------------------------- Text block ------------------------- */
function TextBlockSection({ s }: { s: SectionOf<'textBlock'> }) {
  const brand = s.background === 'brand';
  return (
    <section className={bgClass[s.background]}>
      <div className={cn('container py-16 sm:py-20', s.align === 'center' && 'text-center')}>
        <div className={cn('max-w-3xl', s.align === 'center' && 'mx-auto')}>
          {s.title && <h2 className="text-3xl font-bold sm:text-4xl">{s.title}</h2>}
          <div
            className={cn(
              'mt-4 space-y-4 text-lg',
              brand ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            <Paragraphs text={s.body} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Image + text ------------------------ */
function ImageTextSection({ s }: { s: SectionOf<'imageText'> }) {
  const brand = s.background === 'brand';
  return (
    <section className={bgClass[s.background]}>
      <div className="container grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2">
        <div className={cn(s.imageSide === 'left' && 'lg:order-2')}>
          {s.title && <h2 className="text-3xl font-bold sm:text-4xl">{s.title}</h2>}
          <div
            className={cn(
              'mt-4 space-y-4 text-lg',
              brand ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            <Paragraphs text={s.body} />
          </div>
          {s.cta.label && (
            <SiteLink
              href={s.cta.href}
              className={cn('mt-7', buttonVariants({ size: 'lg', variant: brand ? 'secondary' : 'sun' }))}
            >
              {s.cta.label}
            </SiteLink>
          )}
        </div>
        <SiteImg
          image={s.image}
          lazy
          frameClassName="overflow-hidden rounded-lg border shadow-sm"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
    </section>
  );
}
