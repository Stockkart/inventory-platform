import { describe, expect, it, vi } from 'vitest';
import { pathsToPreload, whenBrowserIdle } from './routeChunkPreload';

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
