/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CafeKot } from '../types/kot';

/**
 * These tests drive the rendered bar, not an extracted helper.
 *
 * What breaks here is the ordering (tickets only once the server has taken the punch), the
 * guard (one press, one round), the try/catch (a swallowed punch is an order the kitchen
 * never sees), the resume (a press whose answer was lost must still reach paper) and the
 * dedupe (a replayed ticket must not print an unstamped second slip). None of that lives in
 * a pure function, so none of it is tested through one — `kotBarState.spec.ts` covers the
 * wording, this file covers the behaviour.
 *
 * Interaction is driven with `fireEvent` rather than `user-event`, which this workspace does
 * not link. For the double-fire test that is the sharper tool anyway: three synchronous
 * clicks land inside the same tick, before React can re-render the disabled state.
 */

const punch = vi.fn();
const getKotPdf = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeKotApi: {
    punch: (...args: unknown[]) => punch(...args),
    reprint: vi.fn(),
    getKotPdf: (...args: unknown[]) => getKotPdf(...args),
  },
}));

/**
 * `../lib/printKot` is deliberately **not** mocked.
 *
 * Mocking it wholesale severs the bar from the print queue, which makes
 * `expect(getKotPdf).not.toHaveBeenCalled()` true whatever the failure path does — an
 * enqueue injected into the `catch` would pass. The real `printKot` runs here instead, so
 * `getKotPdf` is called exactly when a ticket actually reaches the printer, and only the two
 * browser calls at the very end of the transport are stubbed out.
 */
const openedWindows: Array<{ print: ReturnType<typeof vi.fn> }> = [];

function stubPrintTransport() {
  window.URL.createObjectURL = vi.fn(() => 'blob:kot');
  window.URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, 'open').mockImplementation(() => {
    const win = { addEventListener: vi.fn(), print: vi.fn() };
    openedWindows.push(win);
    return win as unknown as Window;
  });
}

/**
 * A ticket in the shape the server actually returns. Annotated so the fixture stays under the
 * wire contract — this package's `tsconfig.lib.json` excludes specs from typechecking, so an
 * unannotated literal would drift from `CafeKot` invisibly.
 */
function kot(overrides: Partial<CafeKot> = {}): CafeKot {
  return {
    kotId: 'k1',
    shopId: 'shop-1',
    purchaseId: 'p1',
    kotNo: 12,
    department: 'KITCHEN',
    roundNo: 1,
    kind: 'ISSUE',
    lines: [{ lineId: 'l1', name: 'Masala Dosa', quantity: 2, note: 'no onion' }],
    ...overrides,
  };
}

async function renderBar(props: { purchaseId?: string | null; disabled?: boolean } = {}) {
  const { CafeKotBar } = await import('./CafeKotBar');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <CafeKotBar
        purchaseId={'purchaseId' in props ? props.purchaseId ?? null : 'p1'}
        disabled={props.disabled}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  openedWindows.length = 0;
  stubPrintTransport();
  getKotPdf.mockResolvedValue(new Blob());
});

afterEach(() => {
  // This workspace runs vitest with `globals: false`, so RTL never registers its own
  // auto-cleanup and every rendered bar would otherwise pile up in the same document.
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe('CafeKotBar', () => {
  it('punches the open cart with no body and prints the tickets the server created', async () => {
    punch.mockResolvedValue([kot()]);

    await renderBar();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));

    await waitFor(() => expect(punch).toHaveBeenCalledTimes(1));
    // The cart id and an idempotency key, and nothing else — the server computes the delta.
    const [purchaseId, key] = punch.mock.calls[0];
    expect(purchaseId).toBe('p1');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);

    // The ticket reached the printer through the real printKot -> getKotPdf chain. This is
    // the live wiring that gives the failure test's `not.toHaveBeenCalled()` its meaning.
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));
    expect(await screen.findByText(/KOT 12 · KITCHEN/)).toBeTruthy();
    expect(await screen.findByText(/Sent 1 kitchen ticket/)).toBeTruthy();
  });

  it('says plainly that a press with nothing new created nothing', async () => {
    // A no-op that looks like an error makes a cashier press again.
    punch.mockResolvedValue([]);

    await renderBar();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));

    expect(await screen.findByText(/Nothing new to send/)).toBeTruthy();
    // Not an error: nothing here claims a failure, and nothing printed.
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => Promise.resolve());
    expect(getKotPdf).not.toHaveBeenCalled();
  });

  it('surfaces a failed punch instead of swallowing it', async () => {
    punch.mockRejectedValue(
      Object.assign(new Error('boom'), {
        response: { status: 500, data: { message: 'Kitchen printer unreachable' } },
      }),
    );

    await renderBar();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Kitchen printer unreachable');
    // Nothing printed: no ticket fetched, and no print dialog opened. `printKot` is real in
    // this file, so an enqueue reaching the queue from the `catch` fails both of these.
    await act(async () => Promise.resolve());
    expect(getKotPdf).not.toHaveBeenCalled();
    expect(openedWindows).toHaveLength(0);
    expect(screen.queryByText(/^KOT /)).toBeNull();
  });

  it('sends one round per press even when the next clicks land before the network answers', async () => {
    let release: (value: CafeKot[]) => void = () => undefined;
    punch.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve as (value: CafeKot[]) => void;
        }),
    );

    await renderBar();
    const button = await screen.findByRole('button', { name: 'Print KOT' });

    // Three native clicks dispatched inside one act, so React has no chance to re-render the
    // button into its disabled state between them — exactly what a real double-click or an
    // impatient second tap on a slow connection does. `fireEvent.click` would re-render
    // between presses and exercise nothing. Only the synchronous in-flight guard can stop
    // the second and third.
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Without the synchronous guard all three presses would each start a round; the request
    // is still unanswered, so the button is still the one they pressed.
    await waitFor(() => expect(punch).toHaveBeenCalledTimes(1));
    await act(async () => Promise.resolve());
    expect(punch).toHaveBeenCalledTimes(1);

    await act(async () => {
      release([kot()]);
    });
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));
    expect(punch).toHaveBeenCalledTimes(1);
  });

  it('replays a punch whose answer was lost, and tells the cashier the round was recovered', async () => {
    // What the cashier comes back to after the response was lost: the server already recorded
    // the round and made its tickets, so pressing Print KOT again would correctly create
    // nothing. Only the parked key knows a round is outstanding.
    window.sessionStorage.setItem('cafe.kot.punchKey:p1', JSON.stringify({ key: 'parked-key-1' }));
    punch.mockResolvedValue([kot()]);

    await renderBar();

    // Same key, same cart — the server replays the tickets it already made rather than
    // cooking the round a second time.
    await waitFor(() => expect(punch).toHaveBeenCalledTimes(1));
    expect(punch.mock.calls[0]).toEqual(['p1', 'parked-key-1']);

    // Those tickets reach the printer, and the cashier is told what happened rather than
    // watching paper appear for a round they do not remember pressing.
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));
    expect(await screen.findByText(/Recovered an unfinished round/)).toBeTruthy();
    expect(screen.getByText(/Nothing was ordered twice/)).toBeTruthy();

    // Settled, so the next press starts a fresh round rather than replaying this one.
    await waitFor(() => expect(window.sessionStorage.getItem('cafe.kot.punchKey:p1')).toBeNull());
  });

  /**
   * The strip used to dedupe on its own while every returned ticket was enqueued, so a
   * replayed response drove a second print of a slip that is NOT stamped REPRINT — the exact
   * "reads as a second order" failure the stamp exists to prevent.
   */
  it('does not print a ticket twice when the server replays one already printed here', async () => {
    punch.mockResolvedValue([kot({ kotId: 'k1', kotNo: 12 })]);

    await renderBar();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));

    // The same ticket comes back a second time — a retried punch the server answers from its
    // idempotency record.
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));
    await waitFor(() => expect(punch).toHaveBeenCalledTimes(2));
    await act(async () => Promise.resolve());

    expect(getKotPdf.mock.calls.filter(([id]) => id === 'k1')).toHaveLength(1);
    expect(openedWindows).toHaveLength(1);
  });

  it('surfaces a failed resume, and keeps the round resumable', async () => {
    window.sessionStorage.setItem('cafe.kot.punchKey:p1', JSON.stringify({ key: 'parked-key-1' }));
    punch.mockRejectedValue(
      Object.assign(new Error('boom'), {
        response: { status: 503, data: { message: 'Kitchen service down' } },
      }),
    );

    await renderBar();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Could not recover an unfinished round');
    expect(alert.textContent).toContain('Kitchen service down');
    expect(getKotPdf).not.toHaveBeenCalled();
    // A 5xx keeps the key: the round is still outstanding and still resumable.
    expect(window.sessionStorage.getItem('cafe.kot.punchKey:p1')).toContain('parked-key-1');
  });

  it('does not resume when there is nothing parked', async () => {
    await renderBar();
    await screen.findByRole('button', { name: 'Print KOT' });
    await act(async () => Promise.resolve());

    expect(punch).not.toHaveBeenCalled();
  });

  it('offers no press before a cart exists, so nothing can be punched against no order', async () => {
    await renderBar({ purchaseId: null });

    const button = await screen.findByRole('button', { name: 'Print KOT' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    await act(async () => Promise.resolve());
    expect(punch).not.toHaveBeenCalled();
  });
});
