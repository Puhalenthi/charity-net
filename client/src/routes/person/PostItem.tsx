import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_IMAGES_PER_ITEM, geohashFor } from '@charity-net/shared';
import { useAuth } from '@/lib/auth';
import { getApi } from '@/lib/api';
import { uploadItemImage, type UploadedImage } from '@/lib/upload';
import { getBrowserLocation, geocodeQuery } from '@/lib/geolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Trash2, Upload } from 'lucide-react';

export function PostItemPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [resolved, setResolved] = useState<{ lat: number; lng: number; city?: string; postalCode?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, MAX_IMAGES_PER_ITEM);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (!user) return;
    if (!resolved) {
      toast({ title: 'Add a location', description: 'Tell charities where the item is.', variant: 'destructive' });
      return;
    }
    if (files.length === 0) {
      toast({ title: 'Add at least one photo', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const tmpId = crypto.randomUUID();
      const uploaded: UploadedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        uploaded.push(await uploadItemImage(user.uid, tmpId, i, files[i]!));
      }
      const { item } = await getApi().createItem({
        title,
        description,
        images: uploaded,
        location: { ...resolved, geohash: geohashFor(resolved) },
      });
      toast({ title: 'Item posted', description: 'We are scanning your photos now.', variant: 'success' });
      navigate(`/items/${item.id}`);
    } catch (err) {
      toast({ title: 'Could not post', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Post an item</h1>
      <p className="text-muted-foreground mb-6">Photo, a couple of details, and we'll match it with local charities.</p>
      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="block">
            <div className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-accent/30">
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm">Click to choose photos (up to {MAX_IMAGES_PER_ITEM})</div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative group">
                  <img src={src} alt="" className="w-full aspect-square object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="absolute top-1 right-1 grid place-items-center h-7 w-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Beige fabric sofa" />
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Condition, dimensions, pickup notes…" />
          </div>
          <div className="space-y-1">
            <Label>Pickup location</Label>
            <div className="flex gap-2">
              <Input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="City or postal code" />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!locationQuery.trim()) {
                    const pos = await getBrowserLocation();
                    if (pos) setResolved(pos);
                    return;
                  }
                  try {
                    const r = await geocodeQuery(locationQuery);
                    setResolved(r);
                  } catch (err) {
                    toast({ title: 'Could not look up location', description: (err as Error).message, variant: 'destructive' });
                  }
                }}
              >
                Locate
              </Button>
            </div>
            {resolved && <p className="text-xs text-muted-foreground">{resolved.city ?? `${resolved.lat.toFixed(3)}, ${resolved.lng.toFixed(3)}`}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={handleSubmit} disabled={loading || !title}>
          {loading ? 'Posting…' : 'Post item'}
        </Button>
      </div>
    </div>
  );
}
