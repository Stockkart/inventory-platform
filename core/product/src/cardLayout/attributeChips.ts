import type { InventoryItem } from '../model/types';

/**
 * Attribute chip labels shown after a card's sections (configurable-product-card Req 7.7). Moved
 * out of `ProductSearchCard` so the renderer and the `itemType` / `discountApplicable` field
 * resolvers share one wording.
 */

export function itemTypeLabel(item: InventoryItem): string | null {
  if (!item.itemType || item.itemType === 'NORMAL') {
    return null;
  }
  if (item.itemType === 'DEGREE' && item.itemTypeDegree != null) {
    return `Temp ${item.itemTypeDegree}°`;
  }
  if (item.itemType === 'COSTLY') {
    return 'Costly';
  }
  return item.itemType;
}

export function discountLabel(item: InventoryItem): string | null {
  if (!item.discountApplicable) {
    return null;
  }
  if (item.discountApplicable === 'DISCOUNT') {
    return 'Discount';
  }
  if (item.discountApplicable === 'SCHEME') {
    return 'Scheme';
  }
  return 'Discount + scheme';
}

export function schemeLabel(item: InventoryItem): string | null {
  const schemeType = item.schemeType ?? 'FIXED_UNITS';
  if (schemeType === 'PERCENTAGE' && item.schemePercentage != null) {
    return `${item.schemePercentage}% scheme`;
  }
  if (
    (schemeType === 'FIXED_UNITS' || !item.schemeType) &&
    item.scheme != null &&
    item.scheme > 0
  ) {
    return `${item.scheme} free`;
  }
  return null;
}

/** The chips a card shows for an item, in today's order, blanks removed. */
export function attributeChips(item: InventoryItem): string[] {
  return [itemTypeLabel(item), discountLabel(item), schemeLabel(item)].filter(
    (c): c is string => Boolean(c),
  );
}
