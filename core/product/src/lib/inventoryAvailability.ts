import type { InventoryItem } from '../model/types';

/** Shop-wide available stock in base units (physical minus open quotation reservations). */
export function getShopAvailableBaseCount(item: InventoryItem): number {
  if (item.availableBaseCount != null) return item.availableBaseCount;
  return item.currentBaseCount ?? item.currentCount ?? 0;
}

/** Shop-wide available stock in display units. */
export function getShopAvailableDisplayCount(item: InventoryItem): number {
  if (item.availableCount != null) return Number(item.availableCount);
  return item.currentCount ?? item.currentBaseCount ?? 0;
}

/**
 * Available for the active cart line: shop-wide available plus this cart's own reservation
 * (cart upsert validation excludes the current quotation on the server).
 */
export function getCartAvailableBaseCount(item: InventoryItem, ownBaseQuantityInCart = 0): number {
  return getShopAvailableBaseCount(item) + Math.max(0, ownBaseQuantityInCart);
}
