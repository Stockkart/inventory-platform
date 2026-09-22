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

// The print transport opens a window and prints; here it only needs to resolve. The queue's
// own behaviour is covered by lib/printQueue.spec.ts.
vi.mock('../lib/printKot', () => ({ printKot: vi.fn().mockResolvedValue(undefined) }));

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
  sellCatalogGet.mockResolvedValue(MENU);
  listQuotations.mockResolvedValue({ quotations: [] });
  tabList.mockResolvedValue([tab()]);
  getKotPdf.mockResolvedValue(new Blob());
});

afterEach(() => {
  // This workspace runs vitest with `globals: false`, so RTL never registers its own
  // auto-cleanup and every rendered screen would otherwise pile up in the same document.
  cleanup();
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
    // Nothing printed, and the round is still on the tab to try again.
    expect(getKotPdf).not.toHaveBeenCalled();
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
