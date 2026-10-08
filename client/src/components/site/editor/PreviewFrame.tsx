import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children inside a same-origin iframe at a fixed device width, scaled
 * down to fit the pane. Living in an iframe means Tailwind's responsive
 * breakpoints follow the *device* width, so the mobile preview really shows
 * the mobile layout. Children are portalled, so React context (router, theme,
 * editor state) flows through unchanged.
 */
export function PreviewFrame({ width, children }: { width: number; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(800);
  const [loaded, setLoaded] = useState(false);

  // Boot the iframe document once srcDoc has loaded (writing to the initial
  // about:blank document gets wiped in some browsers): copy the app's styles
  // and theme class in.
  useLayoutEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!loaded || !doc?.body) return;

    const syncStyles = () => {
      doc.head.querySelectorAll('[data-copied]').forEach((n) => n.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
        const clone = n.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-copied', '');
        doc.head.appendChild(clone);
      });
    };
    const syncTheme = () => {
      doc.documentElement.className = document.documentElement.className;
    };
    syncStyles();
    syncTheme();
    doc.body.className = document.body.className;
    doc.body.style.margin = '0';

    // Vite HMR swaps <style> tags in dev; the theme toggle flips <html>.
    const styleObs = new MutationObserver(syncStyles);
    styleObs.observe(document.head, { childList: true, subtree: true, characterData: true });
    const themeObs = new MutationObserver(syncTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const root = doc.createElement('div');
    doc.body.appendChild(root);
    setMount(root);
    return () => {
      styleObs.disconnect();
      themeObs.disconnect();
      root.remove();
      setMount(null);
    };
  }, [loaded]);

  // Fit the device width into the pane.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  // Grow the iframe to its content so the pane (not the iframe) scrolls.
  useEffect(() => {
    if (!mount) return;
    const ro = new ResizeObserver(() => setHeight(Math.max(400, mount.scrollHeight)));
    ro.observe(mount);
    return () => ro.disconnect();
  }, [mount]);

  return (
    <div ref={outerRef} className="w-full">
      <div className="mx-auto" style={{ width: width * scale, height: height * scale }}>
        <iframe
          ref={iframeRef}
          title="Page preview"
          srcDoc="<!doctype html><html><head></head><body></body></html>"
          onLoad={() => setLoaded(true)}
          style={{
            width,
            height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
          }}
          className="rounded-md bg-background shadow-sm ring-1 ring-border"
        />
      </div>
      {mount && createPortal(children, mount)}
    </div>
  );
}
