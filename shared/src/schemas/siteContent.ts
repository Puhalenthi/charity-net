import { z } from 'zod';

/**
 * Editable public-site content (landing page + header/footer), managed from
 * the admin Site editor. Published content is world-readable and rendered
 * as-is, so every URL is restricted to safe schemes here — this schema is the
 * only thing standing between the editor and a `javascript:` link.
 */

const SHORT = 200;
const LONG = 2000;
const MAX_LIST = 60;
const MAX_SECTIONS = 40;

const id = z.string().min(1).max(64);
const short = z.string().max(SHORT);
const long = z.string().max(LONG);

/** Internal route, external http(s), mailto/tel, in-page anchor — or empty. */
export const SafeHrefSchema = z
  .string()
  .max(500)
  .refine((v) => v === '' || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v), {
    message: 'Links must start with /, #, https://, mailto: or tel:',
  });

/** Site-relative asset path or https URL (Storage download URLs) — or empty. */
export const SafeImageUrlSchema = z
  .string()
  .max(2000)
  .refine((v) => v === '' || /^(\/(?!\/)|https:\/\/)/i.test(v) || /^http:\/\/(127\.0\.0\.1|localhost):9199\//.test(v), {
    message: 'Images must be a site path or an https URL',
  });

export const SiteLinkSchema = z.object({ label: short, href: SafeHrefSchema });
export type SiteLink = z.infer<typeof SiteLinkSchema>;

export const SiteImageSchema = z.object({ url: SafeImageUrlSchema, alt: short });
export type SiteImage = z.infer<typeof SiteImageSchema>;

/** Icons the editor offers; the client maps each name to a lucide icon. */
export const SITE_ICONS = [
  'camera',
  'map-pin',
  'message-circle',
  'heart',
  'truck',
  'package',
  'home',
  'users',
  'gift',
  'recycle',
  'star',
  'phone',
  'calendar',
  'check-circle',
  'sparkles',
  'handshake',
  'warehouse',
  'leaf',
] as const;
export type SiteIcon = (typeof SITE_ICONS)[number];
const icon = z.enum(SITE_ICONS);

const BACKGROUNDS = ['plain', 'tinted', 'brand'] as const;
export type SiteBackground = (typeof BACKGROUNDS)[number];

const base = { id, hidden: z.boolean().default(false) };

export const HeroSectionSchema = z.object({
  ...base,
  type: z.literal('hero'),
  eyebrow: short,
  title: short,
  body: long,
  primary: SiteLinkSchema,
  secondary: SiteLinkSchema,
  showSignInHint: z.boolean().default(true),
  image: SiteImageSchema,
  badge: short,
});

export const StepsSectionSchema = z.object({
  ...base,
  type: z.literal('steps'),
  title: short,
  subtitle: long,
  steps: z.array(z.object({ id, icon, title: short, body: long })).max(MAX_LIST),
});

export const GallerySectionSchema = z.object({
  ...base,
  type: z.literal('gallery'),
  title: short,
  subtitle: long,
  cta: SiteLinkSchema,
  items: z
    .array(z.object({ id, image: SiteImageSchema, title: short, place: short, tag: short }))
    .max(MAX_LIST),
});

export const ChipsSectionSchema = z.object({
  ...base,
  type: z.literal('chips'),
  title: short,
  subtitle: long,
  chips: z.array(z.object({ id, label: short })).max(MAX_LIST),
});

export const StatsSectionSchema = z.object({
  ...base,
  type: z.literal('stats'),
  items: z.array(z.object({ id, value: short, label: short })).max(12),
});

export const CtaSectionSchema = z.object({
  ...base,
  type: z.literal('cta'),
  icon,
  title: short,
  body: long,
  primary: SiteLinkSchema,
  secondary: SiteLinkSchema,
});

export const TextBlockSectionSchema = z.object({
  ...base,
  type: z.literal('textBlock'),
  title: short,
  body: z.string().max(10000),
  align: z.enum(['left', 'center']).default('left'),
  background: z.enum(BACKGROUNDS).default('plain'),
});

export const ImageTextSectionSchema = z.object({
  ...base,
  type: z.literal('imageText'),
  title: short,
  body: z.string().max(10000),
  image: SiteImageSchema,
  imageSide: z.enum(['left', 'right']).default('right'),
  cta: SiteLinkSchema,
  background: z.enum(BACKGROUNDS).default('plain'),
});

export const SiteSectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  StepsSectionSchema,
  GallerySectionSchema,
  ChipsSectionSchema,
  StatsSectionSchema,
  CtaSectionSchema,
  TextBlockSectionSchema,
  ImageTextSectionSchema,
]);
export type SiteSection = z.infer<typeof SiteSectionSchema>;
export type SiteSectionType = SiteSection['type'];
export type SectionOf<T extends SiteSectionType> = Extract<SiteSection, { type: T }>;

export const SiteHeaderSchema = z.object({
  brandName: short,
  logoUrl: SafeImageUrlSchema,
  cta: SiteLinkSchema,
});
export type SiteHeader = z.infer<typeof SiteHeaderSchema>;

export const SiteFooterSchema = z.object({
  blurb: long,
  linksTitle: short,
  links: z.array(SiteLinkSchema.extend({ id })).max(20),
  copyright: short,
});
export type SiteFooter = z.infer<typeof SiteFooterSchema>;

export const SiteContentSchema = z.object({
  schemaVersion: z.literal(1),
  header: SiteHeaderSchema,
  footer: SiteFooterSchema,
  landing: z.object({ sections: z.array(SiteSectionSchema).max(MAX_SECTIONS) }),
});
export type SiteContent = z.infer<typeof SiteContentSchema>;

/** Stored doc = content + bookkeeping the server stamps on write. */
export type SiteContentDoc = SiteContent & { updatedAt?: number; updatedBy?: string };

export type SiteVersionSummary = {
  id: string;
  publishedAt: number;
  publishedBy: string | null;
  publishedByName: string | null;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  schemaVersion: 1,
  header: {
    brandName: 'Storage Auction Connect',
    logoUrl: '',
    cta: { label: 'Give an item', href: '/signup' },
  },
  footer: {
    blurb:
      'A reuse network. Give what you no longer need to people who do, and keep good things out of the landfill.',
    linksTitle: 'Get involved',
    links: [
      { id: 'f1', label: 'Give an item', href: '/signup' },
      { id: 'f2', label: 'Run a charity', href: '/signup' },
      { id: 'f3', label: 'Map', href: '/explore' },
      { id: 'f4', label: 'Sign in', href: '/login' },
    ],
    copyright: 'Storage Auction Connect. Made for local communities.',
  },
  landing: {
    sections: [
      {
        id: 'hero',
        type: 'hero',
        hidden: false,
        eyebrow: 'A neighbourhood reuse network',
        title: 'Good stuff, passed on to people who need it.',
        body: "Got a sofa, a bike, or a box of things you no longer use? Take a photo and local charities can claim it and pick it up. It's free, and nothing ends up in a landfill.",
        primary: { label: 'Give an item', href: '/signup' },
        secondary: { label: 'I run a charity', href: '/signup' },
        showSignInHint: true,
        image: { url: '/photos/m4.webp', alt: 'A donated patterned sofa ready for pickup' },
        badge: 'Free · pickup nearby',
      },
      {
        id: 'how-it-works',
        type: 'steps',
        hidden: false,
        title: 'How it works',
        subtitle: 'Three steps from your spare room to someone who needs it.',
        steps: [
          {
            id: 's1',
            icon: 'camera',
            title: 'Take a photo',
            body: 'Snap the item you want to give away. A short description helps, but the photo does most of the work.',
          },
          {
            id: 's2',
            icon: 'map-pin',
            title: 'A charity nearby claims it',
            body: 'Charities in your area see what you posted and reserve the things they can use.',
          },
          {
            id: 's3',
            icon: 'message-circle',
            title: 'Arrange the pickup',
            body: 'Message inside the app to sort out a time. They come and collect it. Done.',
          },
        ],
      },
      {
        id: 'gallery',
        type: 'gallery',
        hidden: false,
        title: 'Recently given',
        subtitle: 'Real things neighbours have passed on lately.',
        cta: { label: 'Post yours', href: '/signup' },
        items: [
          { id: 'g1', image: { url: '/photos/m4.webp', alt: 'Patterned 3-seat sofa' }, title: 'Patterned 3-seat sofa', place: 'Teaneck', tag: 'Free' },
          { id: 'g2', image: { url: '/photos/m2.webp', alt: "Kids' cruiser bike" }, title: "Kids' cruiser bike", place: 'Ridgewood', tag: 'Free' },
          { id: 'g3', image: { url: '/photos/m1.webp', alt: 'Queen bed with mattress' }, title: 'Queen bed with mattress', place: 'Hackensack', tag: 'Free' },
          { id: 'g4', image: { url: '/photos/m6.webp', alt: 'Tall floor lamp' }, title: 'Tall floor lamp', place: 'Fort Lee', tag: 'Free' },
          { id: 'g5', image: { url: '/photos/m5.webp', alt: 'Round glass side table' }, title: 'Round glass side table', place: 'Englewood', tag: 'Free' },
          { id: 'g6', image: { url: '/photos/m3.webp', alt: 'Grey sofa bed' }, title: 'Grey sofa bed', place: 'Paramus', tag: 'Free' },
        ],
      },
      {
        id: 'categories',
        type: 'chips',
        hidden: false,
        title: 'What people give',
        subtitle: 'Almost anything usable finds a home. A few of the regulars:',
        chips: [
          'Furniture', 'Appliances', 'Housewares', 'Books', 'Clothing',
          'Toys', 'Bikes', 'Lamps', 'Kitchen', 'Building materials',
        ].map((label, i) => ({ id: `c${i + 1}`, label })),
      },
      {
        id: 'stats',
        type: 'stats',
        hidden: false,
        items: [
          { id: 't1', value: '300', label: 'Items rehomed' },
          { id: 't2', value: '5', label: 'Partner charities in NJ & GA' },
          { id: 't3', value: 'Nationwide', label: 'Coverage' },
          { id: 't4', value: '46–72h', label: 'Typical pickup time' },
        ],
      },
      {
        id: 'final-cta',
        type: 'cta',
        hidden: false,
        icon: 'heart',
        title: 'Have something to give?',
        body: "Posting takes about a minute. That's usually all it takes to find it a better home.",
        primary: { label: 'Give an item', href: '/signup' },
        secondary: { label: 'Sign in', href: '/login' },
      },
    ],
  },
};
