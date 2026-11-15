/**
 * Background preloading of dashboard screen code.
 *
 * On a click React Router runs `import(route.module)`. The browser then finds the module's
 * imports and fetches them, so a screen opened for the first time waits on two serial
 * rounds of network requests (about 1s on Netlify). `RouteChunkPreloader` removes that
 * wait by asking for every sidebar screen's files once the browser is idle.
 */

/** Sidebar paths worth preloading: unique, in nav order, without the screen already open. */
export function pathsToPreload(navPaths: readonly string[], currentPath: string): string[] {
  const seen = new Set<string>([currentPath]);
  const out: string[] = [];
  for (const path of navPaths) {
    if (!path.startsWith('/') || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/**
 * Route CSS files to prefetch. On a click React Router waits for every file in the
 * route's manifest `css` list (`prefetchRouteCss`), but `PrefetchPageLinks` only prefetches
 * CSS a route returns from a `links()` export, which our routes don't have. Hrefs are kept
 * exactly as in the manifest (some end in `#`) so they match what React Router requests.
 */
export function routeCssToPrefetch(
  routes: Iterable<{ css?: readonly string[] } | undefined>,
  alreadyLoaded: ReadonlySet<string>,
): string[] {
  const out = new Set<string>();
  for (const route of routes) {
    for (const href of route?.css ?? []) {
      if (!alreadyLoaded.has(href)) out.add(href);
    }
  }
  return [...out];
}

type IdleWindow = Pick<Window, 'setTimeout' | 'clearTimeout'> & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Runs `cb` when the browser has nothing better to do, so preloading never competes with
 * the current screen's own files and API calls. Safari has no `requestIdleCallback`; it
 * falls back to a timer. Returns a cancel function.
 */
export function whenBrowserIdle(
  win: IdleWindow,
  cb: () => void,
  fallbackDelayMs = 2000,
): () => void {
  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(cb, { timeout: 10_000 });
    return () => win.cancelIdleCallback?.(id);
  }
  const id = win.setTimeout(cb, fallbackDelayMs);
  return () => win.clearTimeout(id);
}
