/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CafeTab } from '../types/tab';

/**
 * These tests drive the rendered screen, not an extracted helper.
 *
 * What breaks on this screen is the ordering (tickets only once the server has taken the
 * flush), the guard (one press, one round), the try/catch (a swallowed flush is an order the
 * kitchen never sees) and what the cashier is left looking at afterwards (an empty tab that
 * still has its token). None of that lives in a pure function, so none of it is tested
 * through one.
 *
 * Interaction is driven with `fireEvent` rather than `user-event`, which this workspace does
 * not link. For the double-fire test that is the sharper tool anyway: three synchronous
 * clicks land inside the same tick, before React can re-render the disabled state.
 */

const tabList = vi.fn();
const tabOpen = vi.fn();
const tabAddLine = vi.fn();
const tabRemoveLine = vi.fn();
const tabClose = vi.fn();
const tabFlush = vi.fn();
const getKotPdf = vi.fn();
const listQuotations = vi.fn();
const sellCatalogGet = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeTabApi: {
    list: (...args: unknown[]) => tabList(...args),
    open: (...args: unknown[]) => tabOpen(...args),
    addLine: (...args: unknown[]) => tabAddLine(...args),
    removeLine: (...args: unknown[]) => tabRemoveLine(...args),
    close: (...args: unknown[]) => tabClose(...args),
    flush: (...args: unknown[]) => tabFlush(...args),
  },
  cafeKotApi: {
    punch: vi.fn(),
    reprint: vi.fn(),
    getKotPdf: (...args: unknown[]) => getKotPdf(...args),
  },
}));

vi.mock('@inventory-platform/product/api', () => ({
  cartApi: { listQuotations: (...args: unknown[]) => listQuotations(...args) },
  sellCatalogApi: { get: (...args: unknown[]) => sellCatalogGet(...args) },
}));

/**
 * `../lib/printKot` is deliberately **not** mocked.
 *
 * Mocking it wholesale severed the page from the print queue, which made
 * `expect(getKotPdf).not.toHaveBeenCalled()` true whatever the failure path did — an
 * enqueue injected into the `catch` passed the test. The real `printKot` runs here instead,
 * so `getKotPdf` is called exactly when a ticket actually reaches the printer, and only the
 * two browser calls at the very end of the transport are stubbed out.
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

const MENU = {
  menu: {
    sections: [
      {
        id: 's1',
        title: 'Mains',
        items: [
          { id: 'm1', name: 'Masala Dosa', sellingPrice: 120, sellMode: 'menu' },
          { id: 'm2', name: 'Filter Coffee', sellingPrice: 40, sellMode: 'menu' },
        ],
      },
    ],
  },
  directStock: [],
};

function tab(overrides: Partial<CafeTab> = {}): CafeTab {
  return { id: 't1', tokenNo: '7', status: 'OPEN', lines: [], ...overrides };
}

const DOSA_LINE = {
  lineRef: 'l1',
  sellableRef: 'menu:m1',
  name: 'Masala Dosa',
  quantity: 2,
  note: 'no onion',
  department: 'KITCHEN',
};

function bill(purchaseId: string, tokenNo: string, itemCount: number) {
  return {
    purchaseId,
    status: 'CREATED',
    customerName: 'Walk-in',
    tokenNo,
    itemCount,
    grandTotal: 100,
  };
}

async function renderPage() {
  const { CafeKotPage } = await import('./CafeKotPage');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <CafeKotPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  openedWindows.length = 0;
  stubPrintTransport();
  sellCatalogGet.mockResolvedValue(MENU);
  listQuotations.mockResolvedValue({ quotations: [] });
  tabList.mockResolvedValue([tab()]);
  getKotPdf.mockResolvedValue(new Blob());
});

afterEach(() => {
  // This workspace runs vitest with `globals: false`, so RTL never registers its own
  // auto-cleanup and every rendered screen would otherwise pile up in the same document.
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe('CafeKotPage', () => {
  it('composes a line with a preparation note onto the open tab', async () => {
    tabAddLine.mockResolvedValue(tab({ lines: [DOSA_LINE] }));
    tabList.mockResolvedValueOnce([tab()]).mockResolvedValue([tab({ lines: [DOSA_LINE] })]);

    await renderPage();
    const strip = await screen.findByLabelText('Kitchen tabs');
    await waitFor(() => expect(within(strip).getByText('Token 7')).toBeTruthy());

    fireEvent.change(await screen.findByLabelText('Menu item'), { target: { value: 'menu:m1' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Preparation note'), { target: { value: 'no onion' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to tab' }));

    await waitFor(() => expect(tabAddLine).toHaveBeenCalledTimes(1));
    expect(tabAddLine).toHaveBeenCalledWith('t1', {
      sellableRef: 'menu:m1',
      quantity: 2,
      note: 'no onion',
    });

    // The composed round is what the cashier now sees pending on the tab.
    const pending = await screen.findByRole('list', { name: 'Pending items' });
    expect(within(pending).getByText('2 × Masala Dosa')).toBeTruthy();
    expect(within(pending).getByText('no onion')).toBeTruthy();
  });

  it('asks which bill the round goes on, listing the open bills plus a new one', async () => {
    tabList.mockResolvedValue([tab({ lines: [DOSA_LINE] })]);
    listQuotations.mockResolvedValue({ quotations: [bill('p1', '3', 2), bill('p2', '4', 1)] });

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));

    const bills = await screen.findByRole('list', { name: 'Open bills' });
    await waitFor(() =>
      expect(within(bills).getByRole('button', { name: /Token 3 · 2 items/ })).toBeTruthy(),
    );
    expect(within(bills).getByRole('button', { name: /Token 4 · 1 item/ })).toBeTruthy();
    // Plus the new-bill option, which is not one of the listed bills.
    expect(screen.getByRole('button', { name: 'New bill' })).toBeTruthy();
  });

  it('empties the tab but keeps its token after a successful flush, and says so', async () => {
    tabList
      .mockResolvedValueOnce([tab({ lines: [DOSA_LINE] })])
      .mockResolvedValue([tab({ lines: [] })]);
    tabFlush.mockResolvedValue([{ kotId: 'k1', kotNo: '12', department: 'KITCHEN' }]);

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New bill' }));

    await waitFor(() => expect(tabFlush).toHaveBeenCalledTimes(1));
    expect(tabFlush.mock.calls[0][1]).toEqual({ purchaseId: null });

    // The ticket reached the printer through the real printKot -> getKotPdf chain. This is
    // the live wiring that gives the failure test's `not.toHaveBeenCalled()` its meaning.
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));
    expect(await screen.findByText(/KOT 12 · KITCHEN/)).toBeTruthy();

    // The tab is still there, still Token 7, with nothing pending on it.
    expect(await screen.findByText(/Token 7 is still open and now empty/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('2 × Masala Dosa')).toBeNull());
    expect(within(screen.getByLabelText('Kitchen tabs')).getByText('Token 7')).toBeTruthy();
    expect(screen.getByText(/Nothing pending on this tab/)).toBeTruthy();
  });

  it('surfaces a failed flush instead of swallowing it, and keeps the round on the tab', async () => {
    tabList.mockResolvedValue([tab({ lines: [DOSA_LINE] })]);
    tabFlush.mockRejectedValue(
      Object.assign(new Error('boom'), {
        response: { status: 500, data: { message: 'Kitchen printer unreachable' } },
      }),
    );

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New bill' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Kitchen printer unreachable');
    // Nothing printed: no ticket fetched, and no print dialog opened. `printKot` is real in
    // this file, so an enqueue reaching the queue from the `catch` fails both of these.
    await act(async () => Promise.resolve());
    expect(getKotPdf).not.toHaveBeenCalled();
    expect(openedWindows).toHaveLength(0);
    expect(screen.queryByText(/^KOT /)).toBeNull();
    // And the round is still on the tab to try again.
    expect(screen.getByText('2 × Masala Dosa')).toBeTruthy();
  });

  it('sends one round per press even when the next clicks land before the network answers', async () => {
    tabList.mockResolvedValue([tab({ lines: [DOSA_LINE] })]);
    let release: (value: unknown[]) => void = () => undefined;
    tabFlush.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve as (value: unknown[]) => void;
        }),
    );

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Print KOT' }));
    const newBill = await screen.findByRole('button', { name: 'New bill' });

    // Three native clicks dispatched inside one act, so React has no chance to re-render the
    // button into its disabled state between them — exactly what a real double-click or an
    // impatient second tap on a slow connection does. Only the synchronous in-flight guard
    // can stop the second and third.
    await act(async () => {
      newBill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      newBill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      newBill.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Without the synchronous guard all three presses would each start a round; the request
    // is still unanswered, so the button is still the one they pressed.
    await waitFor(() => expect(tabFlush).toHaveBeenCalledTimes(1));
    await act(async () => Promise.resolve());
    expect(tabFlush).toHaveBeenCalledTimes(1);

    await act(async () => {
      release([{ kotId: 'k1', kotNo: '12', department: 'KITCHEN' }]);
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tabFlush).toHaveBeenCalledTimes(1);
  });

  it('replays a flush whose answer was lost, and tells the cashier the round was recovered', async () => {
    // What the cashier reopens after the response was lost: the server already claimed and
    // emptied the tab, so there are no lines and Print KOT is disabled. Only the parked key
    // knows a round is outstanding.
    tabList.mockResolvedValue([tab({ lines: [] })]);
    window.sessionStorage.setItem(
      'cafe.kot.punchKey:t1',
      JSON.stringify({ key: 'parked-key-1', variables: { purchaseId: 'p1' } }),
    );
    tabFlush.mockResolvedValue([{ kotId: 'k1', kotNo: '12', department: 'KITCHEN' }]);

    await renderPage();

    // Same key, same bill — the server replays the tickets it already made rather than
    // cooking the round a second time.
    await waitFor(() => expect(tabFlush).toHaveBeenCalledTimes(1));
    expect(tabFlush.mock.calls[0]).toEqual(['t1', { purchaseId: 'p1' }, 'parked-key-1']);

    // Those tickets reach the printer, and the cashier is told what happened rather than
    // watching paper appear for a round they do not remember pressing.
    await waitFor(() => expect(getKotPdf).toHaveBeenCalledWith('k1'));
    expect(await screen.findByText(/Recovered an unfinished round on token 7/)).toBeTruthy();
    expect(screen.getByText(/Nothing was ordered twice/)).toBeTruthy();

    // Settled, so the next press starts a fresh round rather than replaying this one.
    await waitFor(() => expect(window.sessionStorage.getItem('cafe.kot.punchKey:t1')).toBeNull());
  });

  it('surfaces a failed resume on the page, where there is no dialog to show it on', async () => {
    tabList.mockResolvedValue([tab({ lines: [] })]);
    window.sessionStorage.setItem(
      'cafe.kot.punchKey:t1',
      JSON.stringify({ key: 'parked-key-1', variables: { purchaseId: 'p1' } }),
    );
    tabFlush.mockRejectedValue(
      Object.assign(new Error('boom'), {
        response: { status: 503, data: { message: 'Kitchen service down' } },
      }),
    );

    await renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Could not recover an unfinished round on token 7');
    expect(alert.textContent).toContain('Kitchen service down');
    expect(getKotPdf).not.toHaveBeenCalled();
    // A 5xx keeps the key: the round is still outstanding and still resumable.
    expect(window.sessionStorage.getItem('cafe.kot.punchKey:t1')).toContain('parked-key-1');
  });

  it('does not resume when there is nothing parked', async () => {
    tabList.mockResolvedValue([tab({ lines: [DOSA_LINE] })]);

    await renderPage();
    await screen.findByRole('button', { name: 'Print KOT' });
    await act(async () => Promise.resolve());

    expect(tabFlush).not.toHaveBeenCalled();
  });

  it('asks before closing a tab, and closes only once confirmed', async () => {
    tabList.mockResolvedValue([tab({ lines: [DOSA_LINE] })]);
    tabClose.mockResolvedValue(undefined);

    await renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Close tab Token 7' }));

    expect(await screen.findByText(/Closing the tab discards them/)).toBeTruthy();
    expect(tabClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close tab' }));
    await waitFor(() => expect(tabClose).toHaveBeenCalledWith('t1'));
  });
});
