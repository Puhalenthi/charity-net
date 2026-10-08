import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CloudOff,
  ExternalLink,
  History,
  Loader2,
  Monitor,
  Redo2,
  RotateCcw,
  Rocket,
  Smartphone,
  Undo2,
  X,
} from 'lucide-react';
import type { SiteVersionSummary } from '@charity-net/shared';
import { getApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { SitePreviewContext } from '@/components/site/SiteLink';
import { SectionRenderer } from '@/components/site/sections';
import { BrandMark, SignedOutActions, SiteFooter } from '@/components/layout/AppLayout';
import { useSiteEditor, type SaveStatus, type SiteEditorApi } from '@/components/site/editor/useSiteEditor';
import { SectionList } from '@/components/site/editor/SectionList';
import { Inspector, type Selection } from '@/components/site/editor/Inspector';
import { PreviewFrame } from '@/components/site/editor/PreviewFrame';
import { SECTION_META, describeChanges } from '@/components/site/editor/sectionMeta';

type Device = 'desktop' | 'mobile';
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, mobile: 390 };
type MobilePane = 'sections' | 'edit' | 'preview';

export function SiteEditorPage() {
  const editor = useSiteEditor();
  const { content, update, undo, redo } = editor;
  const { toast } = useToast();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('preview');

  // Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y — the editor's own history, so
  // undo works the same everywhere (including across fields and drags).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const select = useCallback((s: Selection | null) => {
    setSelection(s);
    if (s) setMobilePane('edit');
  }, []);

  if (editor.loadError) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <CloudOff className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">The site editor couldn't load.</p>
        <p className="mt-1 text-sm text-muted-foreground">{editor.loadError}</p>
        <Button className="mt-4" onClick={() => void editor.reload()}>Try again</Button>
      </div>
    );
  }
  if (!content) {
    return (
      <div className="grid h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col max-md:h-[calc(100dvh-8rem)]">
      <DefaultPasswordBanner />
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <div className="mr-auto flex items-center gap-3">
          <h1 className="text-base font-semibold">Site editor</h1>
          <StatusPill status={editor.status} unpublished={editor.unpublished} onRetry={() => void editor.retrySave()} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="Undo (Ctrl+Z)" disabled={!editor.canUndo} onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" title="Redo (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden rounded-md border bg-muted/40 p-0.5 sm:flex">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              title={d === 'desktop' ? 'Desktop preview' : 'Phone preview'}
              onClick={() => setDevice(d)}
              className={cn(
                'grid h-8 w-9 place-items-center rounded',
                device === d ? 'bg-background shadow-sm ring-1 ring-border' : 'text-muted-foreground',
              )}
            >
              {d === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View live</span>
          </a>
        </Button>
        <Button size="sm" variant="sun" disabled={!editor.unpublished} onClick={() => setPublishOpen(true)}>
          <Rocket className="h-4 w-4" />
          Publish
        </Button>
      </div>

      {/* Mobile pane switcher */}
      <div className="flex border-b lg:hidden">
        {(['sections', 'edit', 'preview'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMobilePane(p)}
            className={cn(
              'flex-1 py-2 text-sm font-medium capitalize',
              mobilePane === p ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'w-full shrink-0 border-r bg-secondary/30 lg:block lg:w-64',
            mobilePane === 'sections' ? 'block' : 'hidden',
          )}
        >
          <SectionList content={content} selection={selection} onSelect={select} update={update} />
        </aside>

        <main
          className={cn(
            'min-w-0 flex-1 overflow-y-auto bg-muted/40 p-4 lg:block',
            mobilePane === 'preview' ? 'block' : 'hidden',
          )}
          onClick={() => setSelection(null)}
        >
          <PreviewFrame width={DEVICE_WIDTH[device]}>
            <SitePreviewContext.Provider value={true}>
              <div className="min-h-full bg-background text-foreground">
                <Selectable label="Header" active={selection === 'header'} onSelect={() => select('header')}>
                  <header className="border-b bg-background">
                    <div className="container flex h-16 items-center justify-between gap-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <BrandMark header={content.header} />
                        <span className="hidden sm:inline">{content.header.brandName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SignedOutActions header={content.header} />
                      </div>
                    </div>
                  </header>
                </Selectable>
                {content.landing.sections.map((s) => (
                  <Selectable
                    key={s.id}
                    label={SECTION_META[s.type].label}
                    active={selection === s.id}
                    hidden={s.hidden}
                    onSelect={() => select(s.id)}
                  >
                    <SectionRenderer section={s} />
                  </Selectable>
                ))}
                {content.landing.sections.length === 0 && (
                  <div className="py-24 text-center text-muted-foreground">
                    The page is empty — add a section from the list.
                  </div>
                )}
                <Selectable label="Footer" active={selection === 'footer'} onSelect={() => select('footer')}>
                  <SiteFooter header={content.header} footer={content.footer} />
                </Selectable>
              </div>
            </SitePreviewContext.Provider>
          </PreviewFrame>
        </main>

        <aside
          className={cn(
            'w-full shrink-0 overflow-y-auto border-l bg-background lg:block lg:w-[22rem]',
            mobilePane === 'edit' ? 'block' : 'hidden',
          )}
        >
          <Inspector content={content} selection={selection} update={update} />
        </aside>
      </div>

      {historyOpen && (
        <HistoryDrawer
          editor={editor}
          onClose={() => setHistoryOpen(false)}
          onRestored={() => {
            setHistoryOpen(false);
            setSelection(null);
            toast({ title: 'Version restored to your draft', description: 'Check it over, then Publish to make it live.', variant: 'success' });
          }}
        />
      )}
      {publishOpen && (
        <PublishDialog
          editor={editor}
          onClose={() => setPublishOpen(false)}
          onPublished={() => {
            setPublishOpen(false);
            toast({ title: 'Published', description: 'Your changes are live.', variant: 'success' });
          }}
        />
      )}
    </div>
  );
}

/** Click-to-select wrapper around each block in the preview. */
function Selectable({
  label,
  active,
  hidden,
  onSelect,
  children,
}: {
  label: string;
  active: boolean;
  hidden?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && active) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    [active],
  );
  return (
    <div
      ref={ref}
      className="group/sel relative cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect();
      }}
    >
      <div className={cn(hidden && 'opacity-40 grayscale')}>{children}</div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 ring-inset',
          active ? 'ring-[3px] ring-primary' : 'group-hover/sel:ring-2 group-hover/sel:ring-primary/50',
        )}
      />
      <span
        className={cn(
          'pointer-events-none absolute left-2 top-2 z-10 rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow',
          active || hidden ? 'block' : 'hidden group-hover/sel:block',
        )}
      >
        {label}
        {hidden && ' · hidden'}
      </span>
    </div>
  );
}

function StatusPill({ status, unpublished, onRetry }: { status: SaveStatus; unpublished: boolean; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> Not saved — retry
      </button>
    );
  }
  if (status === 'saving' || status === 'dirty') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-emerald-600" />
      {unpublished ? 'Draft saved · not published yet' : 'Saved · live'}
    </span>
  );
}

function DefaultPasswordBanner() {
  const { user } = useAuth();
  if (!(user as { defaultPassword?: boolean } | null)?.defaultPassword) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b bg-sun/15 px-4 py-2 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      You're still using the default password.
      <Link to="/settings" className="font-semibold text-primary underline underline-offset-2">
        Change it in Settings
      </Link>
    </div>
  );
}

function Modal({ title, onClose, children, side }: { title: string; onClose: () => void; children: React.ReactNode; side?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className={cn('fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm', side ? 'justify-end' : 'items-center justify-center p-4')}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden border bg-card shadow-xl',
          side ? 'h-full w-full max-w-md' : 'max-h-[85vh] w-full max-w-md rounded-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PublishDialog({ editor, onClose, onPublished }: { editor: SiteEditorApi; onClose: () => void; onPublished: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const changes = describeChanges(editor.published, editor.content!);
  return (
    <Modal title="Publish changes?" onClose={onClose}>
      <div className="space-y-3 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">
          Everyone visiting the site will see these changes straight away. You can roll back from History at any time.
        </p>
        <ul className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-sm">
          {changes.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-between gap-2 border-t p-3">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('Throw away all unpublished changes and go back to the live version?')) return;
            setBusy(true);
            try {
              await editor.discard();
              onClose();
              toast({ title: 'Draft discarded' });
            } finally {
              setBusy(false);
            }
          }}
        >
          <RotateCcw className="h-4 w-4" /> Discard draft
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="sun"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await editor.publish();
                onPublished();
              } catch (err) {
                toast({ title: 'Publish failed', description: (err as Error).message, variant: 'destructive' });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish now
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryDrawer({ editor, onClose, onRestored }: { editor: SiteEditorApi; onClose: () => void; onRestored: () => void }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<SiteVersionSummary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getApi()
      .siteVersions()
      .then((r) => setVersions(r.versions))
      .catch(() => setVersions([]));
  }, []);

  return (
    <Modal title="Publish history" onClose={onClose} side>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Every publish is saved here. Restoring copies that version into your draft — nothing changes on the live site until you Publish.
        </p>
        {versions === null ? (
          <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been published yet.</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {new Date(v.publishedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.publishedByName ?? 'Admin'}
                    {i === 0 && <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">live now</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId !== null}
                  onClick={async () => {
                    if (editor.unpublished && !window.confirm('This replaces your current unpublished draft. Continue?')) return;
                    setBusyId(v.id);
                    try {
                      await editor.restore(v.id);
                      onRestored();
                    } catch (err) {
                      toast({ title: 'Restore failed', description: (err as Error).message, variant: 'destructive' });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
