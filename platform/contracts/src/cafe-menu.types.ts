export type MenuSellMode = 'menu' | 'direct';

/**
 * One sellable portion of a menu item — Qtr / Half / Full, each named and priced by the shop.
 *
 * `id` is a slug frozen when the portion is first named and never regenerated, because it is
 * what travels on the wire inside the sellable ref (`menu:<itemId>@<rateId>`). `name` is
 * display text the shop may rename freely; renaming must not orphan a cart line or a ticket,
 * which is why the name is never sent. The price is resolved server-side from the menu.
 */
export interface MenuRate {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  /** Null when {@link MenuItem.rates} is non-empty: an item is priced one way or the other. */
  sellingPrice: number | null;
  sellMode: MenuSellMode;
  inventoryId?: string | null;
  available?: boolean;
  cgst?: string | null;
  sgst?: string | null;
  /** Kitchen station that makes this item. Blank means the default kitchen. */
  department?: string | null;
  /**
   * Named portions. When non-empty the item is portioned: `sellingPrice` is null and the only
   * way into a cart is by choosing one portion, whose id rides in the sellable ref.
   */
  rates?: MenuRate[];
}

export interface MenuSection {
  id: string;
  title: string;
  sortOrder?: number;
  items: MenuItem[];
}

export interface ShopMenu {
  id?: string;
  shopId?: string;
  verticalId?: string;
  pluginVersion?: string;
  revision?: number;
  sections: MenuSection[];
  updatedAt?: string;
  updatedBy?: string;
}
