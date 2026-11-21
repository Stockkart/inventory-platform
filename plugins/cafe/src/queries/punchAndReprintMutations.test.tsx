/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const punch = vi.fn();
const reprint = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeKotApi: {
    punch: (...args: unknown[]) => punch(...args),
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

describe('usePunchMutation', () => {
  it('punches the cart through cafeKotApi.punch, with a generated Idempotency-Key', async () => {
    punch.mockResolvedValue([{ kotId: 'k1' }]);
    const { usePunchMutation } = await import('./hooks');
    const { result } = renderHook(() => usePunchMutation('p1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(punch).toHaveBeenCalledTimes(1);
    const [purchaseId, key] = punch.mock.calls[0];
    expect(purchaseId).toBe('p1');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('rejects rather than resolving empty when the punch fails', async () => {
    punch.mockRejectedValue(new Error('boom'));
    const { usePunchMutation } = await import('./hooks');
    const { result } = renderHook(() => usePunchMutation('p1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('boom');
    });
  });

  it('keeps the same key across a retry of one attempt after a server error', async () => {
    punch.mockRejectedValueOnce(Object.assign(new Error('boom'), { response: { status: 500 } }));
    punch.mockResolvedValueOnce([{ kotId: 'k1' }]);
    const { usePunchMutation } = await import('./hooks');
    const { result } = renderHook(() => usePunchMutation('p1'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('boom');
    });
    const firstKey = punch.mock.calls[0][1];

    // The cashier presses Print KOT again — same cart, same round.
    await act(async () => {
      await result.current.mutateAsync();
    });
    const secondKey = punch.mock.calls[1][1];

    expect(secondKey).toBe(firstKey);
  });

  it('uses a different key for a second, independent attempt after a success', async () => {
    punch.mockResolvedValue([{ kotId: 'k1' }]);
    const { usePunchMutation } = await import('./hooks');
    const { result } = renderHook(() => usePunchMutation('p1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });
    const firstKey = punch.mock.calls[0][1];

    await act(async () => {
      await result.current.mutateAsync();
    });
    const secondKey = punch.mock.calls[1][1];

    expect(secondKey).not.toBe(firstKey);
  });

  /**
   * A cart switch mid-punch used to settle against whatever cart was selected when the
   * response landed, not the cart the request went out under: the punched cart's key stayed
   * parked even on success (so the next mount replayed it as a phantom resume, re-printing an
   * UNSTAMPED slip), while a different cart's parked key was deleted, stranding that round
   * for good.
   */
  it('settles the key of the cart the request went out under, not the one now selected', async () => {
    window.sessionStorage.setItem('cafe.kot.punchKey:p2', JSON.stringify({ key: 'parked-p2' }));
    let release: ((value: unknown) => void) | undefined;
    punch.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { usePunchMutation } = await import('./hooks');

    const { result, rerender } = renderHook(
      ({ purchaseId }: { purchaseId: string }) => usePunchMutation(purchaseId),
      { wrapper, initialProps: { purchaseId: 'p1' } },
    );

    let pending: Promise<unknown> | undefined;
    act(() => {
      pending = result.current.mutateAsync();
    });
    await waitFor(() => expect(punch).toHaveBeenCalledTimes(1));
    expect(window.sessionStorage.getItem('cafe.kot.punchKey:p1')).toBeTruthy();

    // The cashier opens the other quotation while the punch is still open.
    rerender({ purchaseId: 'p2' });

    await act(async () => {
      release?.([{ kotId: 'k1' }]);
      await pending;
    });

    // p1's round is settled, so nothing replays it.
    expect(window.sessionStorage.getItem('cafe.kot.punchKey:p1')).toBeNull();
    // p2's own stranded round is untouched, and still resumable.
    expect(window.sessionStorage.getItem('cafe.kot.punchKey:p2')).toContain('parked-p2');
  });

  it('survives a remount: a punch whose response never arrived is retried under the same key', async () => {
    let resolvePunch: ((value: unknown) => void) | undefined;
    punch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePunch = resolve;
        }),
    );
    const { usePunchMutation } = await import('./hooks');

    const first = renderHook(() => usePunchMutation('p1'), { wrapper });
    act(() => {
      // Fire-and-forget: this attempt's response never comes back before the remount.
      void first.result.current.mutateAsync().catch(() => undefined);
    });
    await waitFor(() => expect(punch).toHaveBeenCalledTimes(1));
    const keyBeforeRemount = punch.mock.calls[0][1];

    // The bar remounts (the cashier switches carts and back, or reloads) — a `useRef` alone
    // would lose the key here, exactly the failure `punchKeyStore.ts` exists to prevent.
    first.unmount();

    punch.mockResolvedValueOnce([{ kotId: 'k1' }]);
    const second = renderHook(() => usePunchMutation('p1'), { wrapper });
    await act(async () => {
      await second.result.current.mutateAsync();
    });
    const keyAfterRemount = punch.mock.calls[1][1];

    expect(keyAfterRemount).toBe(keyBeforeRemount);

    resolvePunch?.([]); // settle the abandoned first call so it doesn't dangle past the test
  });
});

describe('useReprintKotMutation', () => {
  it('posts through cafeKotApi.reprint with a generated Idempotency-Key', async () => {
    reprint.mockResolvedValue(new Blob(['%PDF']));
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
