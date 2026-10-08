import { Eye, EyeOff } from 'lucide-react';
import type { SectionOf, SiteContent, SiteSection } from '@charity-net/shared';
import { Button } from '@/components/ui/button';
import {
  Field,
  IconPicker,
  ImageField,
  LinkField,
  SegmentedField,
  SortableList,
  TextAreaField,
  TextField,
  ToggleField,
} from './fields';
import { SECTION_META, newId, sectionTitle } from './sectionMeta';

export type Selection = 'header' | 'footer' | string;

type Update = (mutate: (c: SiteContent) => void, coalesceKey?: string) => void;

const BACKGROUND_OPTIONS = [
  { value: 'plain' as const, label: 'Plain' },
  { value: 'tinted' as const, label: 'Tinted' },
  { value: 'brand' as const, label: 'Brand colour' },
];

export function Inspector({
  content,
  selection,
  update,
}: {
  content: SiteContent;
  selection: Selection | null;
  update: Update;
}) {
  if (!selection) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Click any part of the preview, or pick a section on the left, to edit it.
      </div>
    );
  }
  if (selection === 'header') return <HeaderForm content={content} update={update} />;
  if (selection === 'footer') return <FooterForm content={content} update={update} />;

  const index = content.landing.sections.findIndex((s) => s.id === selection);
  const section = content.landing.sections[index];
  if (!section) return null;

  // Every section form edits through this: replace the section at its index.
  const set: SetFn = (patch, key) =>
    update((c) => {
      const i = c.landing.sections.findIndex((s) => s.id === section.id);
      if (i >= 0) c.landing.sections[i] = { ...c.landing.sections[i]!, ...patch } as SiteSection;
    }, key !== undefined ? `${section.id}.${key}` : undefined);

  const anchors = content.landing.sections.map((s) => ({
    id: s.id,
    label: sectionTitle(s) || SECTION_META[s.type].label,
  }));
  const meta = SECTION_META[section.type];

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <meta.icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{meta.label}</div>
            <div className="text-xs text-muted-foreground">{meta.description}</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => set({ hidden: !section.hidden })}>
          {section.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {section.hidden ? 'Hidden' : 'Visible'}
        </Button>
      </div>
      <SectionForm section={section} set={set} anchors={anchors} />
    </div>
  );
}

/** Shallow-merge a patch into the section (forms only pass that type's fields). */
type SetFn = (patch: Record<string, unknown>, key?: string) => void;

function SectionForm({
  section: s,
  set,
  anchors,
}: {
  section: SiteSection;
  set: SetFn;
  anchors: { id: string; label: string }[];
}) {
  switch (s.type) {
    case 'hero':
      return (
        <>
          <TextField label="Small heading above" value={s.eyebrow} onChange={(v) => set({ eyebrow: v }, 'eyebrow')} />
          <TextAreaField label="Headline" rows={2} value={s.title} onChange={(v) => set({ title: v }, 'title')} />
          <TextAreaField label="Intro text" value={s.body} onChange={(v) => set({ body: v }, 'body')} hint="Leave a blank line to start a new paragraph." />
          <LinkField label="Main button" value={s.primary} anchors={anchors} onChange={(v, k) => set({ primary: v }, `primary.${k}`)} />
          <LinkField label="Second button" value={s.secondary} anchors={anchors} onChange={(v, k) => set({ secondary: v }, `secondary.${k}`)} />
          <ToggleField label='Show "Already here? Sign in"' checked={s.showSignInHint} onChange={(v) => set({ showSignInHint: v })} />
          <ImageField label="Photo" value={s.image} onChange={(v, k) => set({ image: v }, `image.${k}`)} />
          <TextField label="Badge on photo" value={s.badge} placeholder="Leave empty to hide" onChange={(v) => set({ badge: v }, 'badge')} />
        </>
      );
    case 'steps':
      return (
        <>
          <HeadingFields s={s} set={set} />
          <SortableList
            label="Steps"
            items={s.steps}
            max={12}
            addLabel="Add step"
            itemTitle={(st, i) => `Step ${i + 1}${st.title ? ` · ${st.title}` : ''}`}
            onAdd={() => ({ id: newId(), icon: 'star' as const, title: 'New step', body: '' })}
            onChange={(steps, key) => set({ steps } as Partial<SectionOf<'steps'>>, key)}
            renderItem={(st, up) => (
              <>
                <IconPicker value={st.icon} onChange={(icon) => up({ icon }, 'icon')} />
                <TextField label="Title" value={st.title} onChange={(title) => up({ title }, 'title')} />
                <TextAreaField label="Text" rows={3} value={st.body} onChange={(body) => up({ body }, 'body')} />
              </>
            )}
          />
        </>
      );
    case 'gallery':
      return (
        <>
          <HeadingFields s={s} set={set} />
          <LinkField label="Button" value={s.cta} anchors={anchors} onChange={(v, k) => set({ cta: v }, `cta.${k}`)} />
          <SortableList
            label="Photos"
            items={s.items}
            max={60}
            addLabel="Add photo"
            itemTitle={(g, i) => g.title || `Photo ${i + 1}`}
            onAdd={() => ({ id: newId(), image: { url: '', alt: '' }, title: '', place: '', tag: '' })}
            onChange={(items, key) => set({ items } as Partial<SectionOf<'gallery'>>, key)}
            renderItem={(g, up) => (
              <>
                <ImageField label="Photo" hideAlt value={g.image} onChange={(image, k) => up({ image: { ...image, alt: g.title } }, `image.${k}`)} />
                <TextField label="Caption" value={g.title} onChange={(title) => up({ title, image: { ...g.image, alt: title } }, 'title')} />
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Place" value={g.place} onChange={(place) => up({ place }, 'place')} />
                  <TextField label="Tag" value={g.tag} placeholder="e.g. Free" onChange={(tag) => up({ tag }, 'tag')} />
                </div>
              </>
            )}
          />
        </>
      );
    case 'chips':
      return (
        <>
          <HeadingFields s={s} set={set} />
          <SortableList
            label="Labels"
            items={s.chips}
            max={60}
            addLabel="Add label"
            itemTitle={(c) => c.label || 'Label'}
            onAdd={() => ({ id: newId(), label: 'New label' })}
            onChange={(chips, key) => set({ chips } as Partial<SectionOf<'chips'>>, key)}
            renderItem={(c, up) => (
              <TextField label="Text" value={c.label} onChange={(label) => up({ label }, 'label')} />
            )}
          />
        </>
      );
    case 'stats':
      return (
        <SortableList
          label="Numbers"
          items={s.items}
          max={12}
          addLabel="Add number"
          itemTitle={(t) => `${t.value} ${t.label}`.trim() || 'Stat'}
          onAdd={() => ({ id: newId(), value: '0', label: 'New stat' })}
          onChange={(items, key) => set({ items } as Partial<SectionOf<'stats'>>, key)}
          renderItem={(t, up) => (
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <TextField label="Number" value={t.value} onChange={(value) => up({ value }, 'value')} />
              <TextField label="Label" value={t.label} onChange={(label) => up({ label }, 'label')} />
            </div>
          )}
        />
      );
    case 'cta':
      return (
        <>
          <IconPicker value={s.icon} onChange={(icon) => set({ icon })} />
          <TextAreaField label="Headline" rows={2} value={s.title} onChange={(v) => set({ title: v }, 'title')} />
          <TextAreaField label="Text" rows={3} value={s.body} onChange={(v) => set({ body: v }, 'body')} />
          <LinkField label="Main button" value={s.primary} anchors={anchors} onChange={(v, k) => set({ primary: v }, `primary.${k}`)} />
          <LinkField label="Second button" value={s.secondary} anchors={anchors} onChange={(v, k) => set({ secondary: v }, `secondary.${k}`)} />
        </>
      );
    case 'textBlock':
      return (
        <>
          <TextField label="Heading" value={s.title} onChange={(v) => set({ title: v }, 'title')} />
          <TextAreaField label="Text" rows={10} value={s.body} onChange={(v) => set({ body: v }, 'body')} hint="Leave a blank line to start a new paragraph." />
          <SegmentedField
            label="Alignment"
            value={s.align}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centred' }]}
            onChange={(align) => set({ align })}
          />
          <SegmentedField label="Background" value={s.background} options={BACKGROUND_OPTIONS} onChange={(background) => set({ background })} />
        </>
      );
    case 'imageText':
      return (
        <>
          <TextField label="Heading" value={s.title} onChange={(v) => set({ title: v }, 'title')} />
          <TextAreaField label="Text" rows={6} value={s.body} onChange={(v) => set({ body: v }, 'body')} hint="Leave a blank line to start a new paragraph." />
          <ImageField label="Photo" value={s.image} onChange={(v, k) => set({ image: v }, `image.${k}`)} />
          <SegmentedField
            label="Photo position"
            value={s.imageSide}
            options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]}
            onChange={(imageSide) => set({ imageSide })}
          />
          <LinkField label="Button" value={s.cta} anchors={anchors} onChange={(v, k) => set({ cta: v }, `cta.${k}`)} />
          <SegmentedField label="Background" value={s.background} options={BACKGROUND_OPTIONS} onChange={(background) => set({ background })} />
        </>
      );
  }
}

function HeadingFields({ s, set }: { s: { title: string; subtitle: string }; set: SetFn }) {
  return (
    <>
      <TextField label="Heading" value={s.title} onChange={(v) => set({ title: v }, 'title')} />
      <TextAreaField label="Subheading" rows={2} value={s.subtitle} onChange={(v) => set({ subtitle: v }, 'subtitle')} />
    </>
  );
}

function HeaderForm({ content, update }: { content: SiteContent; update: Update }) {
  const h = content.header;
  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="text-sm font-semibold">Header</div>
        <div className="text-xs text-muted-foreground">The bar at the top of every page.</div>
      </div>
      <TextField
        label="Site name"
        value={h.brandName}
        onChange={(v) => update((c) => void (c.header.brandName = v), 'header.brandName')}
      />
      <ImageField
        label="Logo"
        hideAlt
        value={{ url: h.logoUrl, alt: '' }}
        onChange={(v) => update((c) => void (c.header.logoUrl = v.url))}
      />
      <p className="-mt-3 text-xs text-muted-foreground">Square images work best. Without a logo, a heart icon is shown.</p>
      <LinkField
        label="Header button (signed-out visitors)"
        value={h.cta}
        onChange={(v, k) => update((c) => void (c.header.cta = v), `header.cta.${k}`)}
      />
      <Field label="Always shown">
        <p className="text-xs text-muted-foreground">The Map and Sign in buttons are always shown to visitors who aren't signed in.</p>
      </Field>
    </div>
  );
}

function FooterForm({ content, update }: { content: SiteContent; update: Update }) {
  const f = content.footer;
  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="text-sm font-semibold">Footer</div>
        <div className="text-xs text-muted-foreground">The bottom of every page. The site name and logo come from the header.</div>
      </div>
      <TextAreaField
        label="About text"
        rows={3}
        value={f.blurb}
        onChange={(v) => update((c) => void (c.footer.blurb = v), 'footer.blurb')}
      />
      <TextField
        label="Links heading"
        value={f.linksTitle}
        onChange={(v) => update((c) => void (c.footer.linksTitle = v), 'footer.linksTitle')}
      />
      <SortableList
        label="Links"
        items={f.links}
        max={20}
        addLabel="Add link"
        itemTitle={(l) => l.label || 'Link'}
        onAdd={() => ({ id: newId(), label: 'New link', href: '/' })}
        onChange={(links, key) => update((c) => void (c.footer.links = links), key && `footer.links.${key}`)}
        renderItem={(l, up) => (
          <LinkField label="Link" value={l} onChange={(v, k) => up({ label: v.label, href: v.href }, k)} />
        )}
      />
      <TextField
        label="Copyright line"
        value={f.copyright}
        hint="Shown after “© <current year>”."
        onChange={(v) => update((c) => void (c.footer.copyright = v), 'footer.copyright')}
      />
    </div>
  );
}
