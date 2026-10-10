/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MenuItem, ShopMenu } from '../types/menu';
import { MenuAdminPage } from './MenuAdminPage';

/**
 * These tests drive the rendered page.
 *
 * The behaviour under test is the dirty check, and it cannot be reached through a pure helper:
 * what breaks is whether the Save button is enabled after a cashier edits a portion. Adding the
 * `department` field shipped exactly this bug once — the field was editable, the comparison
 * ignored it, and Save stayed grey over an edit the cashier could see on screen. Portions are the
 * same shape of change, so the assertion is made against the real button's real disabled state.
 *
 * Only the two boundaries are mocked: the HTTP module and the session store. Neither takes part
 * in the comparison, so an assertion here still fails if `normalizeSectionsForCompare` forgets
 * `rates` — the temporary-deletion check was run to confirm that.
 */

const menuGet = vi.fn();
const menuPut = vi.fn();
const cartAdd = vi.fn();

vi.mock('@inventory-platform/product/api', () => ({
  shopMenuApi: {
    get: (...args: unknown[]) => menuGet(...args),
    put: (...args: unknown[]) => menuPut(...args),
  },
  cartApi: { add: (...args: unknown[]) => cartAdd(...args) },
}));

vi.mock('@inventory-platform/session', () => ({
  useNotify: { success: vi.fn(), error: vi.fn() },
  useVerticalSchemaStore: (select: (s: { fetchShopSchema: unknown }) => unknown) =>
    select({ fetchShopSchema: async () => ({ verticalId: 'cafe' }) }),
}));

function savedMenu(items: MenuItem[]): ShopMenu {
  return {
    revision: 3,
    sections: [{ id: 's1', title: 'Mains', sortOrder: 0, items }],
  };
}

const portionedItem: MenuItem = {
  id: 'm1',
  name: 'Chicken Biryani',
  sellingPrice: null,
  sellMode: 'menu',
  available: true,
  rates: [
    { id: 'half', name: 'Half', price: 180 },
    { id: 'full', name: 'Full', price: 320 },
  ],
};

const plainItem: MenuItem = {
  id: 'm2',
  name: 'Masala Chai',
  sellingPrice: 30,
  sellMode: 'menu',
  available: true,
};

function saveButton(): HTMLButtonElement {
  // Re-queried on every call: the header re-renders as the menu goes dirty, so a handle kept
  // from before an edit would report the state the button used to have.
  return screen.getByRole('button', { name: 'Save menu' }) as HTMLButtonElement;
}

async function renderPage(items: MenuItem[]) {
  menuGet.mockResolvedValue(savedMenu(items));
  render(<MenuAdminPage />);
  await waitFor(() => expect(saveButton()).toBeTruthy());
}

beforeEach(() => {
  menuGet.mockReset();
  menuPut.mockReset();
  cartAdd.mockReset();
});

afterEach(() => {
  // `globals: false` in this workspace means RTL registers no auto cleanup of its own.
  cleanup();
  vi.restoreAllMocks();
});

describe('MenuAdminPage portions', () => {
  it('starts clean, with Save disabled and nothing claiming unsaved changes', async () => {
    await renderPage([portionedItem]);
    expect(saveButton().disabled).toBe(true);
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('lists each saved portion as a name and a price the shop can edit', async () => {
    await renderPage([portionedItem]);
    const name = screen.getByLabelText('Portion 1 name for Chicken Biryani') as HTMLInputElement;
    const price = screen.getByLabelText('Portion 1 price for Chicken Biryani') as HTMLInputElement;
    expect(name.value).toBe('Half');
    expect(price.value).toBe('180');
    expect(
      (screen.getByLabelText('Portion 2 name for Chicken Biryani') as HTMLInputElement).value,
    ).toBe('Full');
  });

  it('notices a portion rename — the dirty check must include rates', async () => {
    await renderPage([portionedItem]);
    expect(saveButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Portion 1 name for Chicken Biryani'), {
      target: { value: 'Half plate' },
    });

    expect(saveButton().disabled).toBe(false);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('notices a portion reprice', async () => {
    await renderPage([portionedItem]);
    expect(saveButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Portion 2 price for Chicken Biryani'), {
      target: { value: '340' },
    });

    expect(saveButton().disabled).toBe(false);
  });

  it('notices a portion being removed', async () => {
    await renderPage([portionedItem]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove portion Full' }));
    expect(saveButton().disabled).toBe(false);
  });

  it('stays clean while a newly added portion row is still blank', async () => {
    await renderPage([plainItem]);
    fireEvent.click(screen.getByRole('button', { name: 'Add portion' }));
    // An empty row is not yet a portion; it becomes one, and makes the menu dirty, on naming.
    expect(saveButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Portion 1 name for Masala Chai'), {
      target: { value: 'Qtr' },
    });
    expect(saveButton().disabled).toBe(false);
  });

  it('freezes a new portion id as a slug of its first name and keeps it through a rename', async () => {
    await renderPage([plainItem]);
    menuPut.mockImplementation(async (menu: ShopMenu) => menu);

    fireEvent.click(screen.getByRole('button', { name: 'Add portion' }));
    fireEvent.change(screen.getByLabelText('Portion 1 name for Masala Chai'), {
      target: { value: 'Half Cup' },
    });
    fireEvent.change(screen.getByLabelText('Portion 1 price for Masala Chai'), {
      target: { value: '25' },
    });
    // The shop renames it afterwards. The id must not follow, or every cart line and kitchen
    // ticket already pointing at `menu:m2@half-cup` is orphaned.
    fireEvent.change(screen.getByLabelText('Portion 1 name for Masala Chai'), {
      target: { value: 'Small cup' },
    });

    fireEvent.click(saveButton());

    await waitFor(() => expect(menuPut).toHaveBeenCalledTimes(1));
    const sent = menuPut.mock.calls[0][0] as ShopMenu;
    const item = sent.sections[0].items.find((i) => i.id === 'm2');
    expect(item?.rates).toEqual([{ id: 'half-cup', name: 'Small cup', price: 25 }]);
    // Portioned now, so the single price steps aside rather than competing with the portions.
    expect(item?.sellingPrice).toBeNull();
  });

  it('keeps an unportioned item on its single price when saved', async () => {
    await renderPage([plainItem]);
    menuPut.mockImplementation(async (menu: ShopMenu) => menu);

    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '35' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(menuPut).toHaveBeenCalledTimes(1));
    const item = (menuPut.mock.calls[0][0] as ShopMenu).sections[0].items[0];
    expect(item.sellingPrice).toBe(35);
    expect(item.rates).toEqual([]);
  });

  it('hides the single price on a portioned item and sends the cashier to the Sell picker', async () => {
    await renderPage([portionedItem]);
    expect(screen.queryByLabelText('Price')).toBeNull();

    const addToSell = screen.getByRole('button', {
      name: /Pick portion on Sell/i,
    }) as HTMLButtonElement;
    expect(addToSell.disabled).toBe(true);
    expect(cartAdd).not.toHaveBeenCalled();
  });

  it('still adds an unportioned item straight to the cart', async () => {
    await renderPage([plainItem]);
    cartAdd.mockResolvedValue({});

    fireEvent.click(screen.getByRole('button', { name: 'Add to Sell' }));

    await waitFor(() => expect(cartAdd).toHaveBeenCalledTimes(1));
    expect(cartAdd.mock.calls[0][0].items).toEqual([{ sellableRef: 'menu:m2', quantity: 1 }]);
  });
});
