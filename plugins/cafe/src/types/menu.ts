import type { InventoryItem } from '@inventory-platform/product/types';
import type { ShopMenu } from '@inventory-platform/contracts';

export type { MenuItem, MenuSection, ShopMenu, MenuSellMode } from '@inventory-platform/contracts';

/** Backend-assembled sell surface: menu sections + cafe direct stock. */
export interface SellCatalog {
  menu: ShopMenu;
  directStock: InventoryItem[];
}
