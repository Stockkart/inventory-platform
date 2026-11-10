/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PrintState } from '../lib/printQueue';
import type { CafeKot } from '../types/kot';

/**
 * One row per ticket, its action at the end. What a cook pays for when this breaks: a ticket
 * that never reached paper must not offer Reprint (the slip is stamped REPRINT), Reprint must
 * open the blob the reprint call returned rather than a second unstamped fetch, and a failed
 * reprint must say so.
 */

const reprint = vi.fn();

vi.mock('../api/cafe-kot.api', () => ({
  cafeKotApi: {
    punch: vi.fn(),
    listBillKots: vi.fn(),
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
    kotNo: 4,
    department: 'BEVERAGE',
    roundNo: 1,
    kind: 'ISSUE',
    lines: [{ lineId: 'menu:m1', name: 'Cola', quantity: 2 }],
    ...overrides,
  };
}

async function renderStrip(
  tickets: Array<{ kot: CafeKot; state: PrintState }>,
  earlier: CafeKot[] = [],
  onRetry = vi.fn(),
) {
  const { KotTicketStrip } = await import('./KotTicketStrip');
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <KotTicketStrip tickets={tickets} earlier={earlier} onRetry={onRetry} />
    </QueryClientProvider>,
  );
  return onRetry;
}

describe('KotTicketStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    opened.length = 0;
    stubPrintTransport();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('puts Reprint on the same row as a printed ticket', async () => {
    await renderStrip([{ kot: kot(), state: 'PRINTED' }]);
    const row = screen.getByText('KOT 4 · BEVERAGE · Printed').closest('li') as HTMLElement;
    expect(row.querySelector('button')?.textContent).toBe('Reprint');
  });

  it('offers Retry, never Reprint, on a ticket that never reached paper', async () => {
    const onRetry = await renderStrip([{ kot: kot(), state: 'FAILED' }]);
    expect(screen.queryByRole('button', { name: 'Reprint' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledWith('k1');
  });

  it('lists the bill’s earlier rounds as sent, each with Reprint', async () => {
    await renderStrip([], [kot({ kotId: 'k0', kotNo: 2, department: 'KITCHEN' })]);
    expect(screen.getByText('KOT 2 · KITCHEN · Sent')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reprint' })).toBeTruthy();
  });

  it('opens the blob the reprint call returned, and never refetches the document', async () => {
    const stamped = new Blob(['stamped'], { type: 'application/pdf' });
    reprint.mockResolvedValue(stamped);
    await renderStrip([{ kot: kot(), state: 'PRINTED' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Reprint' }));

    await waitFor(() => expect(opened).toEqual(['blob:reprint']));
    expect(reprint).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(stamped);
  });

  it('surfaces a failed reprint instead of looking successful', async () => {
    reprint.mockRejectedValue(new Error('network'));
    await renderStrip([{ kot: kot(), state: 'PRINTED' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Reprint' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(opened).toEqual([]);
  });
});
