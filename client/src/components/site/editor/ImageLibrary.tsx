import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from 'firebase/storage';
import { Check, Loader2, Trash2, Upload, X } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { compressImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// Images bundled with the site (client/public/photos), always available.
const BUILT_IN = Array.from({ length: 8 }, (_, i) => `/photos/m${i + 1}.webp`);

const MAX_BYTES = 8 * 1024 * 1024;

type LibraryImage = { url: string; path: string | null; name: string };

/** Upload into Storage `site/` with progress. Returns the download URL. */
export function useSiteImageUpload() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'That file is not an image', variant: 'destructive' });
        return null;
      }
      setProgress(0);
      try {
        // Photos get resized/compressed (and EXIF/GPS stripped). Small PNG/
        // WebP/GIF files are kept as-is so logos keep their transparency.
        const keepOriginal = /image\/(png|webp|gif|svg\+xml)/.test(file.type) && file.size < 1.5 * 1024 * 1024;
        const body = keepOriginal ? file : await compressImage(file);
        if (body.size > MAX_BYTES) {
          toast({ title: 'Image is too large', description: 'Please use an image under 8 MB.', variant: 'destructive' });
          return null;
        }
        const ext = keepOriginal ? (file.name.split('.').pop() ?? 'png').toLowerCase() : 'jpg';
        const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'image';
        const r = ref(storage, `site/${Date.now()}-${slug}.${ext}`);
        const task = uploadBytesResumable(r, body, {
          contentType: keepOriginal ? file.type : 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        });
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed', (s) => setProgress((s.bytesTransferred / s.totalBytes) * 100), reject, () => resolve());
        });
        return await getDownloadURL(r);
      } catch (err) {
        toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
        return null;
      } finally {
        setProgress(null);
      }
    },
    [toast],
  );

  return { upload, progress };
}

export function ImageLibrary({
  open,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const { toast } = useToast();
  const [uploaded, setUploaded] = useState<LibraryImage[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, progress } = useSiteImageUpload();

  const refresh = useCallback(async () => {
    try {
      const res = await listAll(ref(storage, 'site'));
      const imgs = await Promise.all(
        res.items.map(async (it) => ({ url: await getDownloadURL(it), path: it.fullPath, name: it.name })),
      );
      // Newest first — file names start with the upload timestamp.
      imgs.sort((a, b) => b.name.localeCompare(a.name));
      setUploaded(imgs);
    } catch {
      setUploaded([]);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    let last: string | null = null;
    for (const f of Array.from(files)) last = (await upload(f)) ?? last;
    await refresh();
    // A single upload is almost always meant for this slot — use it directly.
    if (files.length === 1 && last) onPick(last);
  }

  async function remove(img: LibraryImage) {
    if (!img.path) return;
    if (!window.confirm('Delete this image from the library? Any published page still using it will show a broken image.')) return;
    try {
      await deleteObject(ref(storage, img.path));
      toast({ title: 'Image deleted' });
      await refresh();
    } catch (err) {
      toast({ title: 'Could not delete', description: (err as Error).message, variant: 'destructive' });
    }
  }

  const all: LibraryImage[] = [
    ...(uploaded ?? []),
    ...BUILT_IN.map((url) => ({ url, path: null, name: url.split('/').pop()! })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image library"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Image library</h2>
            <p className="text-xs text-muted-foreground">Click an image to use it, or drop new photos anywhere here.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={progress !== null}>
              {progress !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {progress !== null ? `Uploading ${Math.round(progress)}%` : 'Upload'}
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <div className={cn('relative flex-1 overflow-y-auto p-4', dragOver && 'bg-primary/5')}>
          {uploaded === null ? (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {all.map((img) => {
                const selected = img.url === current;
                return (
                  <div key={img.url} className="group relative">
                    <button
                      type="button"
                      onClick={() => onPick(img.url)}
                      className={cn(
                        'block w-full overflow-hidden rounded-md border-2',
                        selected ? 'border-primary' : 'border-transparent hover:border-primary/50',
                      )}
                    >
                      <img src={img.url} alt={img.name} loading="lazy" className="aspect-square w-full object-cover" />
                    </button>
                    {selected && (
                      <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {img.path ? (
                      <button
                        type="button"
                        title="Delete from library"
                        onClick={() => void remove(img)}
                        className="absolute right-1.5 top-1.5 hidden rounded-md bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive group-hover:block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        built-in
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-lg border-2 border-dashed border-primary text-sm font-medium text-primary">
              Drop to upload
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
