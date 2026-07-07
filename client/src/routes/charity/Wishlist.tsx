import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ITEM_CATEGORIES, TAG_VOCABULARY } from '@charity-net/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { getApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Trash2, Plus, ChevronDown, X } from 'lucide-react';

type Row = {
  id?: string;
  tags: string[];
  keywords: string[];
  categories: string[];
  notes?: string;
  active: boolean;
  _collapsed?: boolean; // UI-only; not persisted
};

export function WishlistPage() {
  const { charity } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!charity) return;
    (async () => {
      const snap = await getDocs(collection(db, 'charities', charity.id, 'wishlist'));
      setRows(snap.docs.map((d) => d.data() as Row));
    })().catch(console.error);
  }, [charity?.id]);

  if (!charity) return null;

  function addRow() {
    setRows((prev) => [...prev, { tags: [], keywords: [], categories: [], active: true }]);
  }
  function update(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggle(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, _collapsed: !r._collapsed } : r)));
  }
  const allCollapsed = rows.length > 0 && rows.every((r) => r._collapsed);
  function setAllCollapsed(collapsed: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, _collapsed: collapsed })));
  }

  async function save() {
    if (!charity) return;
    setLoading(true);
    try {
      await getApi().updateWishlist(charity.id, {
        items: rows.map((r) => ({
          tags: r.tags,
          keywords: r.keywords,
          categories: r.categories as never,
          notes: r.notes,
          active: r.active,
        })),
      });
      // Condense every row into its compact summary once saved.
      setRows((prev) => prev.map((r) => ({ ...r, _collapsed: true })));
      toast({ title: 'Wishlist saved', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not save', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-6 space-y-4 max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">When something nearby matches one of these rows, we'll notify you.</p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <Button variant="outline" onClick={() => setAllCollapsed(!allCollapsed)}>
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </Button>
          )}
          <Button onClick={addRow}><Plus className="mr-2 h-4 w-4" /> Add row</Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No wishlist rows yet. Add one to start receiving alerts.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-4">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', row._collapsed && '-rotate-90')} />
                  <CardTitle className="text-base shrink-0">Row {idx + 1}</CardTitle>
                  {row._collapsed && (
                    <span className="truncate text-sm text-muted-foreground">
                      {summarize(row)}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {!row.active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Paused</span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn('space-y-3', row._collapsed && 'hidden')}>
                <div className="space-y-1">
                  <Label>Categories</Label>
                  <TokenPicker
                    options={ITEM_CATEGORIES as unknown as string[]}
                    value={row.categories}
                    onChange={(v) => update(idx, { categories: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tags</Label>
                  <TokenPicker
                    options={TAG_VOCABULARY as unknown as string[]}
                    value={row.tags}
                    onChange={(v) => update(idx, { tags: v })}
                    searchable
                    allowCustom
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={row.notes ?? ''}
                    onChange={(e) => update(idx, { notes: e.target.value })}
                    placeholder="What kind of condition matters most, special pickup notes, etc."
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) => update(idx, { active: e.target.checked })}
                  />
                  Active
                </label>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save wishlist'}</Button>
      </div>
    </div>
  );
}

function summarize(row: Row): string {
  const parts = [...row.categories, ...row.tags];
  if (parts.length === 0) return 'Empty row (click to edit)';
  const shown = parts.slice(0, 4).join(', ');
  const extra = parts.length > 4 ? ` +${parts.length - 4}` : '';
  return shown + extra;
}

function TokenPicker({
  options,
  value,
  onChange,
  searchable,
  allowCustom,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
  allowCustom?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(filter.toLowerCase())).slice(0, 60)
    : options;
  // Values the user typed themselves — they aren't in the vocabulary, so
  // render them as their own removable chips or they'd be invisible.
  const custom = value.filter((v) => !options.includes(v));
  const trimmed = filter.trim();
  const canAddCustom =
    !!allowCustom &&
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === trimmed.toLowerCase());

  function addCustom() {
    if (!canAddCustom) return;
    onChange([...value, trimmed]);
    setFilter('');
  }

  return (
    <div className="space-y-2">
      {searchable && (
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={allowCustom ? 'Search or type your own…' : 'Search…'}
        />
      )}
      {custom.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {custom.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              title="Remove"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {v}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-auto p-1">
        {canAddCustom && (
          <button
            type="button"
            onClick={addCustom}
            className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Add “{trimmed}”
          </button>
        )}
        {filtered.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(active ? value.filter((v) => v !== opt) : [...value, opt])
              }
              className={
                'rounded-full border px-3 py-1 text-xs transition-colors duration-150 ' +
                (active
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/85'
                  : 'hover:border-primary/60 hover:bg-primary/10 hover:text-primary')
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
