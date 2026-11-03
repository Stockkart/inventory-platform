/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CheckoutItemResponse } from '@inventory-platform/product/types';
import { ScanSellMenuCartLine } from './ScanSellMenuCartLine';

/**
 * These tests render the actual cart line, not an extracted pure module. The behaviour that
 * can break here — the sent/partly-sent read, the confirm gate before a withdrawal, declining
 * leaving the quantity untouched, and a failed update becoming visible — all lives in the
 * component's event handlers, not in any function that could be pulled out and tested alone.
 *
 * `onChangeQty` / `onSetQuantity` / `onRemove` are left as plain `vi.fn()` mocks (not a mocked
 * module), so an assertion here can only pass if the component actually called them with the
 * right arguments.
 */

function line(overrides: Partial<CheckoutItemResponse> = {}): CheckoutItemResponse {
  return {
    name: 'Masala Dosa',
    quantity: 3,
    maximumRetailPrice: 120,
    priceToRetail: 120,
    discount: 0,
    totalAmount: 360,
    sellableRef: 'menu:m1',
    sellMode: 'menu',
    ...overrides,
  };
}

function renderLine(overrides: Partial<CheckoutItemResponse> = {}) {
  const onChangeQty = vi.fn().mockResolvedValue(true);
  const onSetQuantity = vi.fn().mockResolvedValue(true);
  const onRemove = vi.fn().mockResolvedValue(true);
  render(
    <ScanSellMenuCartLine
      line={line(overrides)}
      onChangeQty={onChangeQty}
      onSetQuantity={onSetQuantity}
      onRemove={onRemove}
    />,
  );
  return { onChangeQty, onSetQuantity, onRemove };
}

beforeEach(() => {
  vi.spyOn(window, 'confirm');
});

afterEach(() => {
  // This workspace runs vitest with `globals: false`, so RTL never registers its own
  // auto-cleanup and every rendered line would otherwise pile up in the same document.
  cleanup();
  vi.restoreAllMocks();
});

describe('ScanSellMenuCartLine', () => {
  it('shows nothing extra for a line the kitchen has never seen', () => {
    renderLine({ quantity: 3, kotSentQuantity: 0 });
    expect(screen.queryByText(/sent/i)).toBeNull();
  });

  it('reads as sent when the kitchen has the full quantity', () => {
    renderLine({ quantity: 3, kotSentQuantity: 3, department: 'KITCHEN' });
    expect(screen.getByText('Sent · KITCHEN')).toBeTruthy();
  });

  it('reads the partial split when only some of the quantity was sent', () => {
    renderLine({ quantity: 3, kotSentQuantity: 2, department: 'BAR' });
    expect(screen.getByText('2/3 sent · BAR')).toBeTruthy();
    expect(screen.queryByText('Sent · BAR')).toBeNull();
  });

  // kotSentQuantity counts base units. Today every menu item has a unit factor of 1 so quantity and
  // baseQuantity coincide, but menu portions (Qtr/Half/Full) are the next feature and are exactly
  // what makes them diverge. Comparing against the sale-unit count would badge "1/1 sent" on a line
  // the kitchen has only half of.
  it('measures what was sent against base units, not the sale-unit count', () => {
    renderLine({ quantity: 1, baseQuantity: 4, kotSentQuantity: 2, department: 'KITCHEN' });
    expect(screen.getByText('2/4 sent · KITCHEN')).toBeTruthy();
    expect(screen.queryByText('Sent · KITCHEN')).toBeNull();
  });

  it('asks for confirmation, naming the station, before reducing a sent line below what was sent', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { onChangeQty } = renderLine({ quantity: 3, kotSentQuantity: 3, department: 'KITCHEN' });

    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    const message = (window.confirm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(message).toContain('KITCHEN');
    expect(message).toContain('1');
    expect(onChangeQty).toHaveBeenCalledWith('menu:m1', -1);
  });

  it('leaves the quantity untouched when the cashier declines the withdrawal', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { onChangeQty } = renderLine({ quantity: 3, kotSentQuantity: 3, department: 'KITCHEN' });

    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onChangeQty).not.toHaveBeenCalled();
  });

  it('does not confirm a reduction that stays at or above what was sent', () => {
    const { onChangeQty } = renderLine({ quantity: 3, kotSentQuantity: 1, department: 'KITCHEN' });

    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(onChangeQty).toHaveBeenCalledWith('menu:m1', -1);
  });

  it('does not confirm raising the quantity', () => {
    const { onChangeQty } = renderLine({ quantity: 3, kotSentQuantity: 3, department: 'KITCHEN' });

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(onChangeQty).toHaveBeenCalledWith('menu:m1', 1);
  });

  it('asks before removing a sent line, naming the whole remainder and station', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { onRemove } = renderLine({ quantity: 2, kotSentQuantity: 2, department: 'BAR' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    const message = (window.confirm as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(message).toContain('BAR');
    expect(message).toContain('2');
    expect(onRemove).toHaveBeenCalledWith('menu:m1');
  });

  it('removes an unsent line without asking', () => {
    const { onRemove } = renderLine({ quantity: 2, kotSentQuantity: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith('menu:m1');
  });

  it('declining the remove confirmation leaves the line in place', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { onRemove } = renderLine({ quantity: 2, kotSentQuantity: 2, department: 'BAR' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('surfaces a failed withdrawal instead of leaving the cashier to guess', async () => {
    const onRemove = vi.fn().mockResolvedValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <ScanSellMenuCartLine
        line={line({ quantity: 2, kotSentQuantity: 2, department: 'KITCHEN' })}
        onChangeQty={vi.fn().mockResolvedValue(true)}
        onSetQuantity={vi.fn().mockResolvedValue(true)}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/couldn't update|kitchen may still/i);
  });

  it('shows no failure banner when the withdrawal succeeds', async () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    renderLine({ quantity: 2, kotSentQuantity: 2, department: 'KITCHEN' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
