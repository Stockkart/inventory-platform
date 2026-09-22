/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const flush = vi.fn();
const reprint = vi.fn();
const list = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeTabApi: {
    list: (...args: unknown[]) => list(...args),
    open: vi.fn(),
    addLine: vi.fn(),
    removeLine: vi.fn(),
    close: vi.fn(),
    flush: (...args: unknown[]) => flush(...args),
  },
  cafeKotApi: {
    punch: vi.fn(),
    reprint: (...args: unknown[]) => reprint(...args),
    getKotPdf: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe('useFlushTabMutation', () => {
  it('posts the chosen target through cafeTabApi.flush, with a generated Idempotency-Key', async () => {
    flush.mockResolvedValue([{ kotId: 'k1' }]);
    const { useFlushTabMutation } = await import('./hooks');
    const { result } = renderHook(() => useFlushTabMutation('t1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ purchaseId: 'p1' });
    });

    expect(flush).toHaveBeenCalledTimes(1);
    const [tabId, target, key] = flush.mock.calls[0];
    expect(tabId).toBe('t1');
    expect(target).toEqual({ purchaseId: 'p1' });
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('rejects rather than resolving empty when the flush fails', async () => {
    flush.mockRejectedValue(new Error('boom'));
    const { useFlushTabMutation } = await import('./hooks');
    const { result } = renderHook(() => useFlushTabMutation('t1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ purchaseId: 'p1' })).rejects.toThrow('boom');
    });
  });

  it('keeps the same key across a retry of one attempt after a server error', async () => {
    flush.mockRejectedValueOnce(Object.assign(new Error('boom'), { response: { status: 500 } }));
    flush.mockResolvedValueOnce([{ kotId: 'k1' }]);
    const { useFlushTabMutation } = await import('./hooks');
    const { result } = renderHook(() => useFlushTabMutation('t1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ purchaseId: 'p1' })).rejects.toThrow('boom');
    });
    const firstKey = flush.mock.calls[0][2];

    // The caller retries the same attempt — same tab, same round.
    await act(async () => {
      await result.current.mutateAsync({ purchaseId: 'p1' });
    });
    const secondKey = flush.mock.calls[1][2];

    expect(secondKey).toBe(firstKey);
  });

  it('uses a different key for a second, independent attempt after a success', async () => {
    flush.mockResolvedValue([{ kotId: 'k1' }]);
    const { useFlushTabMutation } = await import('./hooks');
    const { result } = renderHook(() => useFlushTabMutation('t1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ purchaseId: 'p1' });
    });
    const firstKey = flush.mock.calls[0][2];

    await act(async () => {
      await result.current.mutateAsync({ purchaseId: 'p1' });
    });
    const secondKey = flush.mock.calls[1][2];

    expect(secondKey).not.toBe(firstKey);
  });

  it('survives a remount: a flush whose response never arrived is retried under the same key', async () => {
    let resolveFlush: ((value: unknown) => void) | undefined;
    flush.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const { useFlushTabMutation } = await import('./hooks');

    const first = renderHook(() => useFlushTabMutation('t1'), { wrapper });
    act(() => {
      // Fire-and-forget: this attempt's response never comes back before the remount.
      void first.result.current.mutateAsync({ purchaseId: 'p1' }).catch(() => undefined);
    });
    await waitFor(() => expect(flush).toHaveBeenCalledTimes(1));
    const keyBeforeRemount = flush.mock.calls[0][2];

    // The screen remounts (navigation, or a reload) — a `useRef` alone would lose the key
    // here, exactly the failure `punchKeyStore.ts` exists to prevent.
    first.unmount();

    flush.mockResolvedValueOnce([{ kotId: 'k1' }]);
    const second = renderHook(() => useFlushTabMutation('t1'), { wrapper });
    await act(async () => {
      await second.result.current.mutateAsync({ purchaseId: 'p1' });
    });
    const keyAfterRemount = flush.mock.calls[1][2];

    expect(keyAfterRemount).toBe(keyBeforeRemount);

    resolveFlush?.([]); // settle the abandoned first call so it doesn't dangle past the test
  });
});

describe('useReprintKotMutation', () => {
  it('posts through cafeKotApi.reprint with a generated Idempotency-Key', async () => {
    reprint.mockResolvedValue({ kotId: 'k1' });
    const { useReprintKotMutation } = await import('./hooks');
    const { result } = renderHook(() => useReprintKotMutation('k1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(reprint).toHaveBeenCalledTimes(1);
    const [kotId, key] = reprint.mock.calls[0];
    expect(kotId).toBe('k1');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('rejects rather than resolving empty when the reprint fails', async () => {
    reprint.mockRejectedValue(new Error('boom'));
    const { useReprintKotMutation } = await import('./hooks');
    const { result } = renderHook(() => useReprintKotMutation('k1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('boom');
    });
  });
});

describe('useCafeTabsQuery / useCafeTabQuery', () => {
  it('fetches the tab list through cafeTabApi.list', async () => {
    const tabs = [
      { id: 't1', tokenNo: '4', status: 'OPEN', lines: [] },
      { id: 't2', tokenNo: '5', status: 'OPEN', lines: [] },
    ];
    list.mockResolvedValue(tabs);
    const { useCafeTabsQuery } = await import('./hooks');
    const { result } = renderHook(() => useCafeTabsQuery(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(tabs));
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('selects one tab by id out of the same list, without a second request', async () => {
    const tabs = [
      { id: 't1', tokenNo: '4', status: 'OPEN', lines: [] },
      { id: 't2', tokenNo: '5', status: 'OPEN', lines: [] },
    ];
    list.mockResolvedValue(tabs);
    const { useCafeTabQuery } = await import('./hooks');
    const { result } = renderHook(() => useCafeTabQuery('t2'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(tabs[1]));
    expect(list).toHaveBeenCalledTimes(1);
  });
});
