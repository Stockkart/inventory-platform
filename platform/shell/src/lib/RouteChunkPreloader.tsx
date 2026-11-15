import { useContext, useEffect, useMemo, useState } from 'react';
import { PrefetchPageLinks, UNSAFE_FrameworkContext, useLocation } from 'react-router';
import { pathsToPreload, routeCssToPrefetch, whenBrowserIdle } from './routeChunkPreload';

/**
 * Once the dashboard has loaded and the browser is idle, renders React Router's
 * `PrefetchPageLinks` for every sidebar screen. Each adds `modulepreload` links for the
 * screen's route module and all of its imports. It also prefetches every route's CSS from
 * the manifest: React Router waits for that CSS on a click, and `PrefetchPageLinks` skips
 * it (it only prefetches CSS from a route's `links()` export). Opening a screen later then
 * needs no network.
 *
 * Needs `routeDiscovery: { mode: 'initial' }` (apps/inventory/react-router.config.ts):
 * `PrefetchPageLinks` only knows routes that are in the client manifest.
 * Files under /assets are cached as immutable (apps/inventory/netlify.toml), so this costs
 * one download per device per deploy.
 */
export function RouteChunkPreloader({ navPaths }: { navPaths: readonly string[] }) {
  const { pathname } = useLocation();
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (idle) return;
    let cancelIdle: (() => void) | undefined;
    const start = () => {
      cancelIdle = whenBrowserIdle(window, () => setIdle(true));
    };
    if (document.readyState === 'complete') {
      start();
      return () => cancelIdle?.();
    }
    window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      cancelIdle?.();
    };
  }, [idle]);

  // Paths are fixed after the first idle pass, so moving between screens does not
  // re-render dozens of link elements. A screen already open needs no preload.
  const [startPath] = useState(pathname);
  const paths = useMemo(() => pathsToPreload(navPaths, startPath), [navPaths, startPath]);

  // Framework mode always provides this context; it is absent only outside a framework
  // router (e.g. a render test), where there is nothing to prefetch.
  const manifest = useContext(UNSAFE_FrameworkContext)?.manifest;
  const cssHrefs = useMemo(() => {
    if (!idle || !manifest) return [];
    const loaded = new Set(
      Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (l) =>
        l.getAttribute('href'),
      ).filter((href): href is string => href != null),
    );
    return routeCssToPrefetch(Object.values(manifest.routes), loaded);
  }, [idle, manifest]);

  if (!idle) return null;
  return (
    <>
      {paths.map((path) => (
        <PrefetchPageLinks key={path} page={path} />
      ))}
      {cssHrefs.map((href) => (
        <link key={href} rel="prefetch" as="style" href={href} />
      ))}
    </>
  );
}
