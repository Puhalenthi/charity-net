import {
  BarChart3,
  Footprints,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  Megaphone,
  PanelTop,
  Tags,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { SiteSection, SiteSectionType } from '@charity-net/shared';

export const newId = (): string => Math.random().toString(36).slice(2, 10);

export const SECTION_META: Record<
  SiteSectionType,
  { label: string; description: string; icon: LucideIcon }
> = {
  hero: { label: 'Hero banner', description: 'Big headline, intro text, buttons and a photo', icon: PanelTop },
  steps: { label: 'Steps', description: 'Numbered cards with icons — e.g. "How it works"', icon: Footprints },
  gallery: { label: 'Photo gallery', description: 'Grid of photos with a caption and place', icon: GalleryHorizontalEnd },
  chips: { label: 'Tag list', description: 'A row of rounded labels — e.g. categories', icon: Tags },
  stats: { label: 'Stats bar', description: 'Big numbers on a coloured band', icon: BarChart3 },
  cta: { label: 'Call to action', description: 'Centred box with a headline and buttons', icon: Megaphone },
  textBlock: { label: 'Text', description: 'A heading and paragraphs of text', icon: Type },
  imageText: { label: 'Image + text', description: 'Photo beside a heading, text and a button', icon: ImageIcon },
};

/** Short human name for a section in lists ("Hero banner · Good stuff…"). */
export function sectionTitle(s: SiteSection): string {
  const t = 'title' in s && s.title ? s.title : s.type === 'stats' ? s.items.map((i) => i.value).join(' · ') : '';
  return t;
}

export function newSection(type: SiteSectionType): SiteSection {
  const id = `${type}-${newId()}`;
  const base = { id, hidden: false };
  switch (type) {
    case 'hero':
      return {
        ...base,
        type,
        eyebrow: 'Eyebrow text',
        title: 'A bold headline',
        body: 'A sentence or two that explains the idea.',
        primary: { label: 'Get started', href: '/signup' },
        secondary: { label: '', href: '' },
        showSignInHint: false,
        image: { url: '/photos/m7.webp', alt: '' },
        badge: '',
      };
    case 'steps':
      return {
        ...base,
        type,
        title: 'How it works',
        subtitle: '',
        steps: [
          { id: newId(), icon: 'camera', title: 'Step one', body: 'Describe the first step.' },
          { id: newId(), icon: 'truck', title: 'Step two', body: 'Describe the second step.' },
          { id: newId(), icon: 'heart', title: 'Step three', body: 'Describe the third step.' },
        ],
      };
    case 'gallery':
      return {
        ...base,
        type,
        title: 'Gallery',
        subtitle: '',
        cta: { label: '', href: '' },
        items: [
          { id: newId(), image: { url: '/photos/m7.webp', alt: '' }, title: 'Photo caption', place: '', tag: '' },
          { id: newId(), image: { url: '/photos/m8.webp', alt: '' }, title: 'Photo caption', place: '', tag: '' },
        ],
      };
    case 'chips':
      return {
        ...base,
        type,
        title: 'A list of things',
        subtitle: '',
        chips: ['First', 'Second', 'Third'].map((label) => ({ id: newId(), label })),
      };
    case 'stats':
      return {
        ...base,
        type,
        items: [
          { id: newId(), value: '100+', label: 'Something counted' },
          { id: newId(), value: '24h', label: 'Something timed' },
        ],
      };
    case 'cta':
      return {
        ...base,
        type,
        icon: 'heart',
        title: 'Ready to help?',
        body: '',
        primary: { label: 'Get started', href: '/signup' },
        secondary: { label: '', href: '' },
      };
    case 'textBlock':
      return {
        ...base,
        type,
        title: 'A heading',
        body: 'Write your text here.\n\nLeave a blank line to start a new paragraph.',
        align: 'left',
        background: 'plain',
      };
    case 'imageText':
      return {
        ...base,
        type,
        title: 'A heading',
        body: 'Write a short paragraph to go beside the picture.',
        image: { url: '/photos/m8.webp', alt: '' },
        imageSide: 'right',
        cta: { label: '', href: '' },
        background: 'plain',
      };
  }
}

/** Deep copy with fresh ids so a duplicate never shares keys with its source. */
export function duplicateSection(s: SiteSection): SiteSection {
  const copy = structuredClone(s) as SiteSection & Record<string, unknown>;
  copy.id = `${s.type}-${newId()}`;
  for (const key of ['steps', 'items', 'chips'] as const) {
    const list = copy[key];
    if (Array.isArray(list)) copy[key] = list.map((it: { id: string }) => ({ ...it, id: newId() }));
  }
  return copy;
}

/** Plain-language change summary shown in the Publish confirmation. */
export function describeChanges(
  before: { header: unknown; footer: unknown; landing: { sections: SiteSection[] } } | null,
  after: { header: unknown; footer: unknown; landing: { sections: SiteSection[] } },
): string[] {
  if (!before) return ['First publish — the whole page goes live.'];
  const out: string[] = [];
  const name = (s: SiteSection) => `${SECTION_META[s.type].label}${sectionTitle(s) ? ` “${sectionTitle(s)}”` : ''}`;
  const prev = new Map(before.landing.sections.map((s) => [s.id, s]));
  const next = new Map(after.landing.sections.map((s) => [s.id, s]));
  if (JSON.stringify(before.header) !== JSON.stringify(after.header)) out.push('Header updated');
  for (const s of after.landing.sections) {
    const p = prev.get(s.id);
    if (!p) out.push(`Added ${name(s)}`);
    else if (p.hidden !== s.hidden) out.push(`${s.hidden ? 'Hid' : 'Showed'} ${name(s)}`);
    else if (JSON.stringify(p) !== JSON.stringify(s)) out.push(`Edited ${name(s)}`);
  }
  for (const s of before.landing.sections) if (!next.has(s.id)) out.push(`Removed ${name(s)}`);
  const order = (l: SiteSection[]) => l.filter((s) => prev.has(s.id) && next.has(s.id)).map((s) => s.id).join();
  if (order(before.landing.sections) !== order(after.landing.sections)) out.push('Reordered sections');
  if (JSON.stringify(before.footer) !== JSON.stringify(after.footer)) out.push('Footer updated');
  return out.length ? out : ['No changes since the last publish.'];
}
