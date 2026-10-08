import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteContentSchema, type SiteContent, type SiteContentDoc } from '@charity-net/shared';
import { getApi } from '@/lib/api';

export type SaveStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'error';

const AUTOSAVE_MS = 800;
const COALESCE_MS = 1000;
const MAX_UNDO = 100;

function strip(doc: SiteContentDoc): SiteContent {
  // Drop server bookkeeping (updatedAt/updatedBy); fall back to the raw doc
  // if it somehow fails validation so the editor can still open it.
  const parsed = SiteContentSchema.safeParse(doc);
  return parsed.success ? parsed.data : (doc as SiteContent);
}

/**
 * Draft state for the Site editor: undo/redo history, debounced autosave to
 * the server draft, and publish/discard/restore. Typing into one field
 * coalesces into a single undo step instead of one per keystroke.
 */
export function useSiteEditor() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [published, setPublished] = useState<SiteContent | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [unpublished, setUnpublished] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [past, setPast] = useState<SiteContent[]>([]);
  const [future, setFuture] = useState<SiteContent[]>([]);
  const lastEdit = useRef<{ key: string; at: number } | null>(null);
  const saveTimer = useRef<number | null>(null);
  const pending = useRef<SiteContent | null>(null);
  const contentRef = useRef<SiteContent | null>(null);
  contentRef.current = content;

  const applyServer = useCallback(
    (r: { draft: SiteContentDoc; published: SiteContentDoc | null; hasUnpublishedChanges: boolean }) => {
      setContent(strip(r.draft));
      setPublished(r.published ? strip(r.published) : null);
      setUnpublished(r.hasUnpublishedChanges);
      setPast([]);
      setFuture([]);
      lastEdit.current = null;
      setStatus('saved');
    },
    [],
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      applyServer(await getApi().siteDraft());
    } catch (err) {
      setLoadError((err as Error).message);
      setStatus('error');
    }
  }, [applyServer]);

  useEffect(() => {
    void load();
  }, [load]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const toSave = pending.current;
    if (!toSave) return true;
    pending.current = null;
    setStatus('saving');
    try {
      await getApi().saveSiteDraft(toSave);
      // Another edit may have queued while we were saving.
      setStatus(pending.current ? 'dirty' : 'saved');
      setUnpublished(true);
      return true;
    } catch {
      pending.current = pending.current ?? toSave;
      setStatus('error');
      return false;
    }
  }, []);

  const queueSave = useCallback(
    (next: SiteContent) => {
      pending.current = next;
      setStatus('dirty');
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  /**
   * Apply an edit. Pass `coalesceKey` (e.g. the field path) for typing so
   * consecutive keystrokes in one field become one undo step.
   */
  const update = useCallback(
    (mutate: (draft: SiteContent) => SiteContent | void, coalesceKey?: string) => {
      const prev = contentRef.current;
      if (!prev) return;
      const working = structuredClone(prev);
      const next = (mutate(working) ?? working) as SiteContent;
      const now = Date.now();
      const coalesce =
        coalesceKey !== undefined &&
        lastEdit.current?.key === coalesceKey &&
        now - lastEdit.current.at < COALESCE_MS;
      if (!coalesce) setPast((p) => [...p.slice(-MAX_UNDO + 1), prev]);
      lastEdit.current = coalesceKey !== undefined ? { key: coalesceKey, at: now } : null;
      setFuture([]);
      setContent(next);
      queueSave(next);
    },
    [queueSave],
  );

  const undo = useCallback(() => {
    const cur = contentRef.current;
    if (!cur || past.length === 0) return;
    const prev = past[past.length - 1]!;
    setPast(past.slice(0, -1));
    setFuture((f) => [cur, ...f]);
    lastEdit.current = null;
    setContent(prev);
    queueSave(prev);
  }, [past, queueSave]);

  const redo = useCallback(() => {
    const cur = contentRef.current;
    if (!cur || future.length === 0) return;
    const next = future[0]!;
    setFuture(future.slice(1));
    setPast((p) => [...p, cur]);
    lastEdit.current = null;
    setContent(next);
    queueSave(next);
  }, [future, queueSave]);

  const publish = useCallback(async () => {
    if (!(await flush())) throw new Error('Could not save your latest changes, so nothing was published.');
    await getApi().publishSite();
    setPublished(contentRef.current);
    setUnpublished(false);
  }, [flush]);

  const discard = useCallback(async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    pending.current = null;
    applyServer(await getApi().discardSiteDraft());
  }, [applyServer]);

  const restore = useCallback(
    async (versionId: string) => {
      await flush();
      applyServer(await getApi().restoreSiteVersion(versionId));
      setUnpublished(true);
    },
    [applyServer, flush],
  );

  // Leaving the editor: push any queued edit right away rather than drop it.
  useEffect(
    () => () => {
      if (pending.current) void getApi().saveSiteDraft(pending.current).catch(() => {});
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // Closing the tab mid-save: let the browser ask first.
  useEffect(() => {
    if (status !== 'dirty' && status !== 'saving' && status !== 'error') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  return {
    content,
    published,
    status,
    unpublished,
    loadError,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    update,
    undo,
    redo,
    publish,
    discard,
    restore,
    retrySave: flush,
    reload: load,
  };
}

export type SiteEditorApi = ReturnType<typeof useSiteEditor>;
