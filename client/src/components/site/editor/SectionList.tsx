import { useEffect, useRef, useState } from 'react';
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
import { Copy, Eye, EyeOff, GripVertical, PanelBottom, PanelTop, Plus, Trash2 } from 'lucide-react';
import type { SiteContent, SiteSection, SiteSectionType } from '@charity-net/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SECTION_META, duplicateSection, newSection, sectionTitle } from './sectionMeta';
import type { Selection } from './Inspector';

type Update = (mutate: (c: SiteContent) => void, coalesceKey?: string) => void;

export function SectionList({
  content,
  selection,
  onSelect,
  update,
}: {
  content: SiteContent;
  selection: Selection | null;
  onSelect: (s: Selection | null) => void;
  update: Update;
}) {
  const sections = content.landing.sections;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    update((c) => {
      const from = c.landing.sections.findIndex((s) => s.id === e.active.id);
      const to = c.landing.sections.findIndex((s) => s.id === e.over!.id);
      c.landing.sections = arrayMove(c.landing.sections, from, to);
    });
  }

  function add(type: SiteSectionType) {
    const section = newSection(type);
    update((c) => {
      // Insert just below the selected section, else at the end.
      const at = c.landing.sections.findIndex((s) => s.id === selection);
      c.landing.sections.splice(at >= 0 ? at + 1 : c.landing.sections.length, 0, section);
    });
    onSelect(section.id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        <PinnedRow icon={PanelTop} label="Header" active={selection === 'header'} onClick={() => onSelect('header')} />
        <div className="py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Home page sections
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sections.map((s) => (
                <SectionRow
                  key={s.id}
                  section={s}
                  active={selection === s.id}
                  onSelect={() => onSelect(s.id)}
                  onToggleHidden={() =>
                    update((c) => {
                      const t = c.landing.sections.find((x) => x.id === s.id);
                      if (t) t.hidden = !t.hidden;
                    })
                  }
                  onDuplicate={() => {
                    const copy = duplicateSection(s);
                    update((c) => {
                      const i = c.landing.sections.findIndex((x) => x.id === s.id);
                      c.landing.sections.splice(i + 1, 0, copy);
                    });
                    onSelect(copy.id);
                  }}
                  onDelete={() => {
                    const label = sectionTitle(s) || SECTION_META[s.type].label;
                    if (!window.confirm(`Delete “${label}”? You can undo this, or restore an older version from History.`)) return;
                    update((c) => {
                      c.landing.sections = c.landing.sections.filter((x) => x.id !== s.id);
                    });
                    if (selection === s.id) onSelect(null);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <AddSectionMenu onAdd={add} disabled={sections.length >= 40} />
        <div className="pt-2">
          <PinnedRow icon={PanelBottom} label="Footer" active={selection === 'footer'} onClick={() => onSelect('footer')} />
        </div>
      </div>
    </div>
  );
}

function PinnedRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-sm font-medium',
        active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SectionRow({
  section,
  active,
  onSelect,
  onToggleHidden,
  onDuplicate,
  onDelete,
}: {
  section: SiteSection;
  active: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const meta = SECTION_META[section.type];
  const title = sectionTitle(section);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-1 rounded-md border bg-card pr-1',
        active && 'border-primary ring-1 ring-primary',
        isDragging && 'relative z-10 shadow-lg',
        section.hidden && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none self-stretch rounded-l-md px-1.5 text-muted-foreground hover:bg-accent active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
        <meta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{meta.label}</span>
          {title && <span className="block truncate text-xs text-muted-foreground">{title}</span>}
        </span>
      </button>
      <IconButton title={section.hidden ? 'Show section' : 'Hide section'} onClick={onToggleHidden}>
        {section.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </IconButton>
      <IconButton title="Duplicate" onClick={onDuplicate} className="hidden group-hover:grid">
        <Copy className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton title="Delete" onClick={onDelete} className="hidden group-hover:grid hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn('grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent', className)}
    >
      {children}
    </button>
  );
}

function AddSectionMenu({ onAdd, disabled }: { onAdd: (t: SiteSectionType) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus className="h-4 w-4" />
        Add section
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-[60vh] overflow-y-auto rounded-md border bg-card p-1 shadow-lg">
          {(Object.keys(SECTION_META) as SiteSectionType[]).map((t) => {
            const m = SECTION_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onAdd(t);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left hover:bg-accent"
              >
                <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
