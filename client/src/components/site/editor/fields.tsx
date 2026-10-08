import { useId, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { SITE_ICONS, type SiteIcon, type SiteImage, type SiteLink } from '@charity-net/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SITE_ICON_COMPONENTS } from '../SiteLink';
import { ImageLibrary, useSiteImageUpload } from './ImageLibrary';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

const ROUTE_SUGGESTIONS = [
  { href: '/signup', label: 'Sign up' },
  { href: '/login', label: 'Sign in' },
  { href: '/explore', label: 'Public map' },
  { href: '/', label: 'Home page' },
];

export function LinkField({
  label,
  value,
  onChange,
  anchors = [],
}: {
  label: string;
  value: SiteLink;
  onChange: (v: SiteLink, key: 'label' | 'href') => void;
  anchors?: { id: string; label: string }[];
}) {
  const listId = useId();
  const invalid = value.href !== '' && !/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(value.href);
  return (
    <Field label={label} hint={value.label ? undefined : 'Leave the text empty to hide this button.'}>
      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <Input
          value={value.label}
          placeholder="Button text"
          onChange={(e) => onChange({ ...value, label: e.target.value }, 'label')}
        />
        <Input
          value={value.href}
          placeholder="/signup or https://…"
          list={listId}
          className={cn(invalid && 'border-destructive focus-visible:ring-destructive')}
          onChange={(e) => onChange({ ...value, href: e.target.value.trim() }, 'href')}
        />
        <datalist id={listId}>
          {ROUTE_SUGGESTIONS.map((r) => (
            <option key={r.href} value={r.href}>{r.label}</option>
          ))}
          {anchors.map((a) => (
            <option key={a.id} value={`#${a.id}`}>Scroll to: {a.label}</option>
          ))}
        </datalist>
      </div>
      {invalid && (
        <p className="text-xs text-destructive">Links must start with /, #, https://, mailto: or tel:</p>
      )}
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex rounded-md border bg-muted/40 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded px-2 py-1.5 text-xs font-medium',
              value === o.value ? 'bg-background shadow-sm ring-1 ring-border' : 'text-muted-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function IconPicker({ value, onChange }: { value: SiteIcon; onChange: (v: SiteIcon) => void }) {
  return (
    <Field label="Icon">
      <div className="grid grid-cols-9 gap-1">
        {SITE_ICONS.map((name) => {
          const Icon = SITE_ICON_COMPONENTS[name];
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={cn(
                'grid h-8 place-items-center rounded-md border',
                value === name ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Thumbnail with Replace / Remove, drag-a-file-onto-it upload and alt text. */
export function ImageField({
  label,
  value,
  onChange,
  hideAlt,
}: {
  label: string;
  value: SiteImage;
  onChange: (v: SiteImage, key: 'url' | 'alt') => void;
  hideAlt?: boolean;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { upload, progress } = useSiteImageUpload();

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = await upload(file);
    if (url) onChange({ ...value, url }, 'url');
  }

  return (
    <Field label={label}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-md border bg-muted/40',
          dragOver && 'ring-2 ring-primary',
        )}
      >
        {value.url ? (
          <img src={value.url} alt={value.alt} className="aspect-[16/9] w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="grid aspect-[16/9] w-full place-items-center text-muted-foreground"
          >
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="h-6 w-6" />
              Choose or drop an image
            </span>
          </button>
        )}
        {progress !== null && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 text-xs font-medium">
            <div className="w-2/3 space-y-1.5 text-center">
              Uploading… {Math.round(progress)}%
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}
        {dragOver && (
          <div className="absolute inset-0 grid place-items-center bg-primary/15 text-sm font-medium text-primary">
            <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Drop to upload</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setLibraryOpen(true)}>
          <ImagePlus className="h-3.5 w-3.5" />
          {value.url ? 'Replace' : 'Choose image'}
        </Button>
        {value.url && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, url: '' }, 'url')}>
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      {!hideAlt && (
        <Input
          value={value.alt}
          placeholder="Describe the picture (for screen readers)"
          className="h-9 text-xs"
          onChange={(e) => onChange({ ...value, alt: e.target.value }, 'alt')}
        />
      )}
      <ImageLibrary
        open={libraryOpen}
        current={value.url}
        onClose={() => setLibraryOpen(false)}
        onPick={(url) => {
          onChange({ ...value, url }, 'url');
          setLibraryOpen(false);
        }}
      />
    </Field>
  );
}

/** Drag-to-reorder list with per-item duplicate/delete and an Add button. */
export function SortableList<T extends { id: string }>({
  label,
  items,
  onChange,
  onAdd,
  addLabel,
  renderItem,
  itemTitle,
  max,
  duplicate,
}: {
  label: string;
  items: T[];
  /** `key` is set for in-item text edits so typing coalesces into one undo step. */
  onChange: (items: T[], key?: string) => void;
  onAdd: () => T;
  addLabel: string;
  renderItem: (item: T, update: (patch: Partial<T>, key: string) => void, index: number) => React.ReactNode;
  itemTitle: (item: T, index: number) => string;
  max?: number;
  duplicate?: (item: T) => T;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onChange(arrayMove(items, from, to));
  }
  const full = max !== undefined && items.length >= max;
  return (
    <Field label={label}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableCard
                key={item.id}
                id={item.id}
                title={itemTitle(item, index)}
                onDuplicate={
                  full
                    ? undefined
                    : () => {
                        const copy = duplicate ? duplicate(item) : { ...structuredClone(item), id: Math.random().toString(36).slice(2, 10) };
                        const next = [...items];
                        next.splice(index + 1, 0, copy);
                        onChange(next);
                      }
                }
                onDelete={() => onChange(items.filter((i) => i.id !== item.id))}
              >
                {renderItem(
                  item,
                  (patch, key) =>
                    onChange(
                      items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
                      `${item.id}.${key}`,
                    ),
                  index,
                )}
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full border-dashed"
        disabled={full}
        onClick={() => onChange([...items, onAdd()])}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </Field>
  );
}

function SortableCard({
  id,
  title,
  onDuplicate,
  onDelete,
  children,
}: {
  id: string;
  title: string;
  onDuplicate?: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-md border bg-card', isDragging && 'relative z-10 shadow-lg ring-2 ring-primary/40')}
    >
      <div className="flex items-center gap-1 border-b px-1.5 py-1">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 truncate text-xs font-medium">{title}</span>
        {onDuplicate && (
          <button type="button" title="Duplicate" onClick={onDuplicate} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" title="Delete" onClick={onDelete} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-2 p-2">{children}</div>
    </div>
  );
}
