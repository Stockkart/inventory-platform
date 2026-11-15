import { useEffect, useMemo, useState } from 'react';
import { PrefetchPageLinks, useLocation } from 'react-router';
import { pathsToPreload, whenBrowserIdle } from './routeChunkPreload';

/**
 * Once the dashboard has loaded and the browser is idle, renders React Router's
 * `PrefetchPageLinks` for every sidebar screen. Each adds `modulepreload` links for the
 * screen's route module and all of its imports, so opening a screen later needs no network.
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

  if (!idle) return null;
  return (
    <>
      {paths.map((path) => (
        <PrefetchPageLinks key={path} page={path} />
      ))}
    </>
  );
}
