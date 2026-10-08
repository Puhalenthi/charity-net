import { Router } from 'express';
import {
  DEFAULT_SITE_CONTENT,
  SiteContentSchema,
  type SiteContent,
  type SiteContentDoc,
  type SiteVersionSummary,
} from '@charity-net/shared';
import { COL } from '../db/collections.js';
import { db } from '../db/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { HttpError } from '../middleware/errorHandler.js';

// Site editor backend. Two docs: `siteContent/draft` (autosaved work in
// progress, admin-only) and `siteContent/published` (world-readable, what the
// landing page renders). Every publish also snapshots into
// `siteContent/published/versions` so a bad publish is one click to undo.
export const siteContentRouter = Router();
siteContentRouter.use(requireAuth, requireAdmin);

const MAX_VERSIONS = 50;

const draftRef = () => COL.siteContent().doc('draft');
const publishedRef = () => COL.siteContent().doc('published');

/** Strip bookkeeping and re-validate so stored docs always round-trip. */
function contentOf(doc: SiteContentDoc | undefined | null): SiteContent | null {
  if (!doc) return null;
  const parsed = SiteContentSchema.safeParse(doc);
  return parsed.success ? parsed.data : null;
}

async function draftState() {
  const [draftSnap, pubSnap] = await Promise.all([draftRef().get(), publishedRef().get()]);
  const published = pubSnap.exists ? (pubSnap.data() as SiteContentDoc) : null;
  const draftDoc = draftSnap.exists ? (draftSnap.data() as SiteContentDoc) : null;
  const draft: SiteContentDoc = draftDoc ?? published ?? DEFAULT_SITE_CONTENT;
  const hasUnpublishedChanges =
    !published ||
    (draftDoc !== null &&
      JSON.stringify(contentOf(draftDoc)) !== JSON.stringify(contentOf(published)));
  return { draft, published, hasUnpublishedChanges };
}

siteContentRouter.get('/draft', async (_req, res, next) => {
  try {
    res.json(await draftState());
  } catch (err) {
    next(err);
  }
});

siteContentRouter.put('/draft', async (req, res, next) => {
  try {
    const content = SiteContentSchema.parse(req.body);
    const updatedAt = Date.now();
    await draftRef().set({ ...content, updatedAt, updatedBy: req.user!.uid });
    res.json({ ok: true, updatedAt });
  } catch (err) {
    next(err);
  }
});

siteContentRouter.delete('/draft', async (_req, res, next) => {
  try {
    await draftRef().delete();
    res.json(await draftState());
  } catch (err) {
    next(err);
  }
});

siteContentRouter.post('/publish', async (req, res, next) => {
  try {
    const uid = req.user!.uid;
    const publishedAt = Date.now();
    const versionRef = COL.siteVersions().doc();
    await db.runTransaction(async (tx) => {
      const [draftSnap, pubSnap] = await Promise.all([tx.get(draftRef()), tx.get(publishedRef())]);
      // Publishing with no draft republishes what's live (or the defaults on
      // first run) — harmless, and it seeds the published doc.
      const source = draftSnap.exists
        ? (draftSnap.data() as SiteContentDoc)
        : pubSnap.exists
          ? (pubSnap.data() as SiteContentDoc)
          : DEFAULT_SITE_CONTENT;
      const content = contentOf(source);
      if (!content) throw new HttpError(400, 'invalid_draft', 'The draft is not valid site content');
      tx.set(publishedRef(), { ...content, updatedAt: publishedAt, updatedBy: uid });
      tx.set(versionRef, { content, publishedAt, publishedBy: uid });
      if (draftSnap.exists) tx.delete(draftRef());
    });

    // Trim history outside the transaction; losing a trim is harmless.
    const old = await COL.siteVersions().orderBy('publishedAt', 'desc').offset(MAX_VERSIONS).get();
    await Promise.all(old.docs.map((d) => d.ref.delete()));

    await COL.adminAudit().add({ type: 'site_publish', actorUid: uid, versionId: versionRef.id, createdAt: publishedAt });
    res.json({ ok: true, versionId: versionRef.id, publishedAt });
  } catch (err) {
    next(err);
  }
});

siteContentRouter.get('/versions', async (_req, res, next) => {
  try {
    const snap = await COL.siteVersions().orderBy('publishedAt', 'desc').limit(MAX_VERSIONS).get();
    const uids = [...new Set(snap.docs.map((d) => d.get('publishedBy') as string).filter(Boolean))];
    const names = new Map<string, string | null>();
    await Promise.all(
      uids.map(async (u) => {
        const p = await COL.users().doc(u).get();
        names.set(u, (p.get('displayName') as string | undefined) ?? null);
      }),
    );
    const versions: SiteVersionSummary[] = snap.docs.map((d) => {
      const by = (d.get('publishedBy') as string | undefined) ?? null;
      return {
        id: d.id,
        publishedAt: d.get('publishedAt') as number,
        publishedBy: by,
        publishedByName: by ? (names.get(by) ?? null) : null,
      };
    });
    res.json({ versions });
  } catch (err) {
    next(err);
  }
});

siteContentRouter.post('/versions/:id/restore', async (req, res, next) => {
  try {
    const snap = await COL.siteVersions().doc(req.params.id).get();
    if (!snap.exists) throw new HttpError(404, 'version_not_found', 'That version no longer exists');
    const content = contentOf(snap.get('content') as SiteContentDoc);
    if (!content) throw new HttpError(400, 'invalid_version', 'That version could not be read');
    // Restore lands in the draft, never straight to live — review, then publish.
    await draftRef().set({ ...content, updatedAt: Date.now(), updatedBy: req.user!.uid });
    res.json(await draftState());
  } catch (err) {
    next(err);
  }
});
