/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CafeKot } from '../types/kot';

/**
 * These tests drive the rendered list.
 *
 * What matters here is not the markup but three rules a cook pays for when they break: the
 * list must not fetch (and so must not exist) until the cashier asks for it; pressing Reprint
 * must open the blob the reprint call returned, never a second unstamped fetch of the same
 * ticket; and a failed reprint must say so rather than silently look successful.
 */

const listBillKots = vi.fn();
const reprint = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeKotApi: {
    punch: vi.fn(),
    listBillKots: (...args: unknown[]) => listBillKots(...args),
    reprint: (...args: unknown[]) => reprint(...args),
    getKotPdf: vi.fn(),
  },
}));

const opened: string[] = [];

function stubPrintTransport() {
  window.URL.createObjectURL = vi.fn(() => 'blob:reprint');
  window.URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, 'open').mockImplementation((url?: string | URL) => {
    opened.push(String(url));
    return { addEventListener: vi.fn(), print: vi.fn() } as unknown as Window;
  });
}

function kot(overrides: Partial<CafeKot> = {}): CafeKot {
  return {
    kotId: 'k1',
    shopId: 'shop-1',
    purchaseId: 'p1',
    kotNo: 14,
    department: 'TANDOOR',
    roundNo: 1,
    kind: 'ISSUE',
    lines: [{ lineId: 'menu:m1', name: 'Malai Chaap', quantity: 2 }],
    reprintCount: 0,
    createdAt: '2026-09-21T13:10:00Z',
    ...overrides,
  };
}

async function renderSentRounds(purchaseId: string | null = 'p1') {
  const { SentRounds } = await import('./SentRounds');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SentRounds purchaseId={purchaseId} />
    </QueryClientProvider>,
  );
}

describe('SentRounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    opened.length = 0;
    stubPrintTransport();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not fetch the bill’s rounds until the cashier opens the list', async () => {
    await renderSentRounds();
    // Collapsed is the common shift. Fetching anyway would put a request on every cart the
    // cashier touches, for a list almost none of them will read.
    expect(listBillKots).not.toHaveBeenCalled();
  });

  it('lists a round with its number, station and items once opened', async () => {
    listBillKots.mockResolvedValue([kot()]);
    await renderSentRounds();

    fireEvent.click(screen.getByRole('button', { name: 'Sent rounds' }));

    expect(await screen.findByText(/KOT 14/)).toBeTruthy();
    expect(screen.getByText('TANDOOR')).toBeTruthy();
    // The item summary is what the cashier matches against what the cook is asking for.
    expect(screen.getByText(/Malai Chaap ×2/)).toBeTruthy();
    expect(listBillKots).toHaveBeenCalledWith('p1');
  });

  it('opens the blob the reprint call returned, and never refetches the document', async () => {
    listBillKots.mockResolvedValue([kot()]);
    const stamped = new Blob(['stamped'], { type: 'application/pdf' });
    reprint.mockResolvedValue(stamped);
    await renderSentRounds();

    fireEvent.click(screen.getByRole('button', { name: 'Sent rounds' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reprint' }));

    await waitFor(() => expect(opened).toEqual(['blob:reprint']));
    // The stamp lives only on the reprint render. A second `getKotPdf` would hand the cook an
    // unstamped slip, which reads as a fresh order for food already being made.
    expect(reprint).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(stamped);
  });

  it('surfaces a failed reprint instead of looking successful', async () => {
    listBillKots.mockResolvedValue([kot()]);
    reprint.mockRejectedValue(new Error('network'));
    await renderSentRounds();

    fireEvent.click(screen.getByRole('button', { name: 'Sent rounds' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reprint' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(opened).toEqual([]);
  });

  it('shows how many times a slip has already been reprinted', async () => {
    listBillKots.mockResolvedValue([kot({ reprintCount: 2 })]);
    await renderSentRounds();

    fireEvent.click(screen.getByRole('button', { name: 'Sent rounds' }));

    // So a second cashier can see the slip already went, rather than sending a third.
    expect(await screen.findByText('Reprinted ×2')).toBeTruthy();
  });

  it('says plainly when the bill has sent the kitchen nothing yet', async () => {
    listBillKots.mockResolvedValue([]);
    await renderSentRounds();

    fireEvent.click(screen.getByRole('button', { name: 'Sent rounds' }));

    expect(await screen.findByText(/Nothing has been sent to the kitchen yet/)).toBeTruthy();
  });

  it('renders nothing at all without a bill', async () => {
    const { container } = await renderSentRounds(null);
    expect(container.textContent).toBe('');
    expect(listBillKots).not.toHaveBeenCalled();
  });
});
