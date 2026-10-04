import { getExtensionFieldString, getInventoryBatchNo } from '@inventory-platform/schema';
import type { InventoryItem } from '../model/types';
import type { ResolvedCardField } from '../model/cardLayout.types';
import { getShopAvailableDisplayCount } from '../lib/inventoryAvailability';
import { discountLabel, itemTypeLabel } from './attributeChips';

/**
 * Raw value lookup for one card field (configurable-product-card Req 7.2, 7.3).
 *
 * Most fields are read straight from the `InventoryItem` at the `itemPath` the catalog supplies.
 * A few are computed — a selling price with a PTR fallback, stock net of reservations, a batch
 * that lives in the vertical extension bag for some verticals — and those register a resolver by
 * `fieldKey` here. Adding a computed field means adding one entry; nothing else changes.
 *
 * Resolvers return the *raw* value (a number, an ISO string, …). Formatting is `formatCardValue`'s
 * job, so a resolver never decides how a rupee looks.
 */
export type FieldResolver = (item: InventoryItem, field: ResolvedCardField) => unknown;

const PRICING_RATE_PREFIX = 'pricing.rate.';

export const FIELD_RESOLVERS: Readonly<Record<string, FieldResolver>> = {
  sellingPrice: (i) => i.sellingPrice ?? i.priceToRetail,
  availableCount: (i) => getShopAvailableDisplayCount(i),
  batchNo: (i) => {
    const b = getInventoryBatchNo(i);
    return b && b !== '—' ? b : null;
  },
  expiryDate: (i) => getExtensionFieldString(i, 'expiryDate') || i.expiryDate || null,
  purchaseDate: (i) => i.purchaseDate ?? i.createdAt ?? null,
  packSize: (i) => packagingFactorDisplay(i),
  saleScheme: (i) => formatSaleScheme(i),
  purchaseScheme: (i) => formatPurchaseScheme(i),
  gstRate: (i) => sumGst(i.sgst, i.cgst),
  itemType: (i) => itemTypeLabel(i) ?? (i.itemType === 'NORMAL' ? 'Normal' : null),
  discountApplicable: (i) => discountLabel(i),
};

/** The raw value for a field: registered resolver, named rate, or `itemPath` read. */
export function resolveRawValue(item: InventoryItem, field: ResolvedCardField): unknown {
  const resolver = FIELD_RESOLVERS[field.fieldKey];
  if (resolver) {
    return resolver(item, field);
  }
  if (field.fieldKey.startsWith(PRICING_RATE_PREFIX)) {
    return rateByName(item, field.fieldKey.slice(PRICING_RATE_PREFIX.length));
  }
  return readPath(item, field.itemPath);
}

/**
 * Reads a dot path from an object; `undefined` when any segment is missing. Deliberately simple:
 * item paths come from our own catalog, never from user input.
 */
export function readPath(source: unknown, path: string | null | undefined): unknown {
  if (!path || source == null) return undefined;
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// ---- computed helpers (previously inline in InventoryAlertDetails / ScanSellPage) --------------

export function packagingFactorDisplay(item: InventoryItem): string {
  const factor = item.unitConversions?.factor ?? item.unitsPerPack ?? null;
  const baseUnit = item.baseUnit?.trim() || item.uqc?.trim() || '';
  if (factor != null && factor > 0) {
    return `1 × ${factor} ${baseUnit || 'units'}`;
  }
  return baseUnit;
}

export function formatSaleScheme(item: InventoryItem): string {
  const st = item.schemeType ?? 'FIXED_UNITS';
  if (st === 'PERCENTAGE' && item.schemePercentage != null) {
    return `${item.schemePercentage}%`;
  }
  if (item.schemePayFor != null || item.schemeFree != null) {
    return `${item.schemePayFor ?? 0}+${item.schemeFree ?? 0}`;
  }
  if (item.scheme != null && item.scheme > 0) {
    return `1+${item.scheme}`;
  }
  return '';
}

export function formatPurchaseScheme(item: InventoryItem): string {
  if (item.purchaseSchemeType === 'PERCENTAGE' && item.purchaseSchemePercentage != null) {
    return `${item.purchaseSchemePercentage}%`;
  }
  if (item.purchaseSchemePayFor != null || item.purchaseSchemeFree != null) {
    return `${item.purchaseSchemePayFor ?? 0} + ${item.purchaseSchemeFree ?? 0}`;
  }
  return '';
}

export function sumGst(sgst: string | null | undefined, cgst: string | null | undefined): number | null {
  const s = Number(sgst);
  const c = Number(cgst);
  if (!Number.isFinite(s) && !Number.isFinite(c)) return null;
  return (Number.isFinite(s) ? s : 0) + (Number.isFinite(c) ? c : 0);
}

export function rateByName(item: InventoryItem, name: string): number | null {
  const rate = item.rates?.find((r) => r.name === name);
  return rate ? rate.price : null;
}
