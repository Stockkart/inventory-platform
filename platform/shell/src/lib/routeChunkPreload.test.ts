import { describe, expect, it, vi } from 'vitest';
import { pathsToPreload, routeCssToPrefetch, whenBrowserIdle } from './routeChunkPreload';

describe('pathsToPreload', () => {
  it('keeps nav order, drops duplicates and the screen already open', () => {
    expect(
      pathsToPreload(
        [
          '/dashboard',
          '/dashboard/product-search',
          '/dashboard/scan-sell',
          '/dashboard/product-search',
        ],
        '/dashboard',
      ),
    ).toEqual(['/dashboard/product-search', '/dashboard/scan-sell']);
  });

  it('skips entries that are not app paths', () => {
    expect(
      pathsToPreload(['https://youtube.com/x', '', '/dashboard/history'], '/dashboard'),
    ).toEqual(['/dashboard/history']);
  });
});

describe('routeCssToPrefetch', () => {
  it('lists each route CSS file once, as written in the manifest', () => {
    expect(
      routeCssToPrefetch(
        [
          { css: ['/assets/client-a.css#', '/assets/scan-sell-b.css#'] },
          {},
          undefined,
          { css: ['/assets/scan-sell-b.css#', '/assets/DenseTable-c.css#'] },
        ],
        new Set(),
      ),
    ).toEqual(['/assets/client-a.css#', '/assets/scan-sell-b.css#', '/assets/DenseTable-c.css#']);
  });

  it('skips stylesheets the page already has', () => {
    expect(
      routeCssToPrefetch(
        [{ css: ['/assets/client-a.css#', '/assets/DenseTable-c.css#'] }],
        new Set(['/assets/client-a.css#']),
      ),
    ).toEqual(['/assets/DenseTable-c.css#']);
  });
});

describe('whenBrowserIdle', () => {
  it('uses requestIdleCallback when the browser has it, and cancels it', () => {
    const cancelIdleCallback = vi.fn();
    const requestIdleCallback = vi.fn(() => 7);
    const win = {
      requestIdleCallback,
      cancelIdleCallback,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    };
    const cb = vi.fn();

    const cancel = whenBrowserIdle(win as never, cb);
    expect(requestIdleCallback).toHaveBeenCalledWith(cb, { timeout: 10_000 });
    expect(win.setTimeout).not.toHaveBeenCalled();

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to a timer without requestIdleCallback (Safari)', () => {
    const win = { setTimeout: vi.fn(() => 3), clearTimeout: vi.fn() };
    const cb = vi.fn();

    const cancel = whenBrowserIdle(win as never, cb, 1500);
    expect(win.setTimeout).toHaveBeenCalledWith(cb, 1500);

    cancel();
    expect(win.clearTimeout).toHaveBeenCalledWith(3);
  });
});
