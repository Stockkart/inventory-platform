/** @vitest-environment jsdom */
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Box } from '@inventory-platform/ui-kit';
import type {
  InventoryItem,
  MenuItem,
  MenuRate,
  SellCatalog,
} from '@inventory-platform/product/types';
import { lineSellableRef, menuSellableRef } from '@inventory-platform/product/types';
import { CafeSellCatalogPanel } from './CafeSellCatalogPanel';

/**
 * These tests drive the rendered catalog. The behaviour at stake — that a portioned item cannot
 * reach the cart without a portion, that each portion shows its own price, and that Half and
 * Full become two lines — lives in the panel's own event handlers and in the cart keying, not in
 * any function that could be pulled out and tested on its own.
 *
 * Nothing is mocked with `vi.mock`. `onAddMenuItem` is a plain `vi.fn()`, and the two-lines test
 * runs the real `menuSellableRef` / `lineSellableRef` against a real reducer, so an assertion
 * here can only pass if the component actually did the thing.
 */

function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'm1',
    name: 'Chicken Biryani',
    sellingPrice: null,
    sellMode: 'menu',
    available: true,
    rates: [
      { id: 'half', name: 'Half', price: 180 },
      { id: 'full', name: 'Full', price: 320 },
    ],
    ...overrides,
  };
}

const plainItem = menuItem({
  id: 'm2',
  name: 'Masala Chai',
  sellingPrice: 30,
  rates: undefined,
});

function catalogOf(...items: MenuItem[]): SellCatalog {
  return {
    menu: { sections: [{ id: 's1', title: 'Mains', items }] },
    directStock: [] as InventoryItem[],
  };
}

function renderPanel(catalog: SellCatalog) {
  const onAddMenuItem = vi.fn();
  const onAddDirectStock = vi.fn();
  render(
    <CafeSellCatalogPanel
      catalog={catalog}
      onAddMenuItem={onAddMenuItem}
      onAddDirectStock={onAddDirectStock}
    />,
  );
  return { onAddMenuItem, onAddDirectStock };
}

/** The tile for an item, found fresh each time — tiles re-render as the picker opens and closes. */
function tile(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(name, 'i') });
}

function picker(): HTMLElement {
  return screen.getByRole('dialog');
}

afterEach(() => {
  // This workspace runs vitest with `globals: false`, so RTL never registers its own auto
  // cleanup and every rendered panel would otherwise pile up in the same document.
  cleanup();
});

describe('CafeSellCatalogPanel portions', () => {
  it('shows a price range on a portioned tile instead of one misleading price', () => {
    renderPanel(catalogOf(menuItem()));
    expect(tile('Chicken Biryani').textContent).toContain('₹180.00 – ₹320.00');
    expect(tile('Chicken Biryani').textContent).toContain('2 portions');
  });

  it('opens a picker listing every portion with its own price beside its own name', () => {
    renderPanel(catalogOf(menuItem()));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(tile('Chicken Biryani'));

    const dialog = picker();
    expect(dialog.textContent).toContain('Chicken Biryani');
    // Each row carries its own price: a bare name beside the range would leave the cashier
    // guessing which half of "₹180 – ₹320" they just charged.
    const half = within(dialog).getByRole('button', { name: /Half/i });
    expect(half.textContent).toContain('Half');
    expect(half.textContent).toContain('₹180.00');
    const full = within(dialog).getByRole('button', { name: /Full/i });
    expect(full.textContent).toContain('Full');
    expect(full.textContent).toContain('₹320.00');
  });

  it('adds nothing while the picker is merely open — the picker is the only way in', () => {
    const { onAddMenuItem } = renderPanel(catalogOf(menuItem()));
    fireEvent.click(tile('Chicken Biryani'));
    expect(picker()).toBeTruthy();
    expect(onAddMenuItem).not.toHaveBeenCalled();
  });

  it('adds the chosen portion and closes the picker', () => {
    const { onAddMenuItem } = renderPanel(catalogOf(menuItem()));
    fireEvent.click(tile('Chicken Biryani'));
    fireEvent.click(within(picker()).getByRole('button', { name: /Half/i }));

    expect(onAddMenuItem).toHaveBeenCalledTimes(1);
    const [item, rate] = onAddMenuItem.mock.calls[0] as [MenuItem, MenuRate];
    expect(item.id).toBe('m1');
    expect(rate).toEqual({ id: 'half', name: 'Half', price: 180 });
    expect(menuSellableRef(item.id, rate.id)).toBe('menu:m1@half');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dismisses on Escape without adding anything', () => {
    const { onAddMenuItem } = renderPanel(catalogOf(menuItem()));
    fireEvent.click(tile('Chicken Biryani'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddMenuItem).not.toHaveBeenCalled();
  });

  it('dismisses on Cancel without adding anything', () => {
    const { onAddMenuItem } = renderPanel(catalogOf(menuItem()));
    fireEvent.click(tile('Chicken Biryani'));
    fireEvent.click(within(picker()).getByRole('button', { name: /^Cancel$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddMenuItem).not.toHaveBeenCalled();
  });

  it('adds an unportioned item straight away, with no picker in the way', () => {
    const { onAddMenuItem } = renderPanel(catalogOf(plainItem));
    expect(tile('Masala Chai').textContent).toContain('₹30.00');

    fireEvent.click(tile('Masala Chai'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddMenuItem).toHaveBeenCalledTimes(1);
    expect(onAddMenuItem.mock.calls[0][0].id).toBe('m2');
    expect(onAddMenuItem.mock.calls[0][1]).toBeUndefined();
    expect(menuSellableRef('m2', undefined)).toBe('menu:m2');
  });

  it('ignores a half-typed portion row that has no frozen id yet', () => {
    const { onAddMenuItem } = renderPanel(
      catalogOf(menuItem({ rates: [{ id: '', name: 'Half', price: 180 }], sellingPrice: 50 })),
    );
    // No sellable portion means the item is not portioned, so it adds directly rather than
    // opening a picker whose only row would put `menu:m1@` on the wire.
    fireEvent.click(tile('Chicken Biryani'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddMenuItem).toHaveBeenCalledTimes(1);
  });
});

/**
 * A cart that keys lines by sellable ref, exactly as the Sell screen's does, driven by the real
 * panel. Half and Full of one dish must become two lines; two Halves must merge into one.
 */
function CartHarness({ catalog }: { catalog: SellCatalog }) {
  const [lines, setLines] = useState<Array<{ sellableRef: string; name: string; qty: number }>>([]);
  return (
    <>
      <CafeSellCatalogPanel
        catalog={catalog}
        onAddMenuItem={(item, rate) => {
          const ref = menuSellableRef(item.id, rate?.id);
          setLines((prev) => {
            const at = prev.findIndex((line) => lineSellableRef(line) === ref);
            if (at >= 0) {
              const next = [...prev];
              next[at] = { ...next[at], qty: next[at].qty + 1 };
              return next;
            }
            return [
              ...prev,
              { sellableRef: ref, name: rate ? `${item.name} (${rate.name})` : item.name, qty: 1 },
            ];
          });
        }}
        onAddDirectStock={() => undefined}
      />
      <Box as="ul" aria-label="cart">
        {lines.map((line) => (
          <Box as="li" key={line.sellableRef} data-ref={line.sellableRef}>
            {line.name} × {line.qty}
          </Box>
        ))}
      </Box>
    </>
  );
}

function cartRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'cart' })).queryAllByRole('listitem');
}

function choosePortion(itemName: string, portion: RegExp) {
  // Re-query both the tile and the row every time: choosing a portion closes the picker and
  // re-renders the tile, so any element handle kept from a previous click is detached and
  // clicking it would exercise nothing.
  fireEvent.click(tile(itemName));
  fireEvent.click(within(picker()).getByRole('button', { name: portion }));
}

describe('portioned lines in a ref-keyed cart', () => {
  it('makes Half and Full of one dish two separate lines', () => {
    render(<CartHarness catalog={catalogOf(menuItem())} />);

    choosePortion('Chicken Biryani', /Half/i);
    choosePortion('Chicken Biryani', /Full/i);

    const rows = cartRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.getAttribute('data-ref'))).toEqual([
      'menu:m1@half',
      'menu:m1@full',
    ]);
    expect(rows[0].textContent).toContain('Chicken Biryani (Half) × 1');
    expect(rows[1].textContent).toContain('Chicken Biryani (Full) × 1');
  });

  it('merges a second Half into the same line, so the split is by portion and not by tap', () => {
    render(<CartHarness catalog={catalogOf(menuItem())} />);

    choosePortion('Chicken Biryani', /Half/i);
    choosePortion('Chicken Biryani', /Half/i);

    const rows = cartRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Chicken Biryani (Half) × 2');
  });
});
