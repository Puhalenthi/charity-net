import { useSyncExternalStore } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_SITE_CONTENT, SiteContentSchema, type SiteContent } from '@charity-net/shared';
import { db } from '@/lib/firebase';

// Published site content (landing page, header, footer) from the Site editor.
// One shared Firestore listener for the whole app; the last good copy is
// cached in localStorage so a reload paints the real content immediately
// instead of flashing the built-in defaults.

const CACHE_KEY = 'sac-site-content';

function readCache(): SiteContent | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = SiteContentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

let current: SiteContent = readCache() ?? DEFAULT_SITE_CONTENT;
const listeners = new Set<() => void>();
let unsubscribe: (() => void) | null = null;

function start() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    doc(db, 'siteContent', 'published'),
    (snap) => {
      const parsed = snap.exists() ? SiteContentSchema.safeParse(snap.data()) : null;
      // Nothing published yet (or unreadable) → the built-in defaults.
      current = parsed?.success ? parsed.data : DEFAULT_SITE_CONTENT;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(current));
      } catch {
        /* storage unavailable — fine, it's only a cache */
      }
      listeners.forEach((l) => l());
    },
    // Offline or blocked: keep whatever we're already showing.
    () => {},
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

export function useSiteContent(): SiteContent {
  return useSyncExternalStore(subscribe, () => current);
}
