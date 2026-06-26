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
import { Trash2, Plus } from 'lucide-react';

type Row = {
  id?: string;
  tags: string[];
  keywords: string[];
  categories: string[];
  notes?: string;
  active: boolean;
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
        <Button onClick={addRow}><Plus className="mr-2 h-4 w-4" /> Add row</Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No wishlist rows yet. Add one to start receiving alerts.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Row {idx + 1}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
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

function TokenPicker({
  options,
  value,
  onChange,
  searchable,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(filter.toLowerCase())).slice(0, 60)
    : options;
  return (
    <div className="space-y-2">
      {searchable && (
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" />
      )}
      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-auto p-1">
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
                'rounded-full border px-3 py-1 text-xs ' +
                (active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent')
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
