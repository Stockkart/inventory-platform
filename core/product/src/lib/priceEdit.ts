import { canEditProductSearchField } from '@inventory-platform/access';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import type { PricingRate } from '@inventory-platform/contracts';
import type { InventoryItem, UpdateInventoryRequest } from '@inventory-platform/product/types';

/**
 * Price fields of a lot. They are edited on the Edit price page only (not in the product search
 * Edit dialog), and saved through `PUT /inventory/{id}`, which applies the product-search grants.
 */
export const PRICE_FIELDS = [
  'priceToRetail',
  'maximumRetailPrice',
  'costPrice',
  'sgst',
  'cgst',
  'saleAdditionalDiscount',
  'rates',
  'defaultRate',
] as const;

export type PriceField = (typeof PRICE_FIELDS)[number];

/**
 * The Edit price page for a lot. The lot id rides in the URL so the page can load and save the
 * lot (and survive a refresh); `pricingId` keeps the existing route.
 */
export function priceEditPath(pricingId: string, inventoryId: string | null | undefined): string {
  const base = `/dashboard/price-edit/${encodeURIComponent(pricingId)}`;
  return inventoryId ? `${base}?lot=${encodeURIComponent(inventoryId)}` : base;
}

/** The Edit price form, as typed. */
export interface PriceDraft {
  priceToRetail: string;
  maximumRetailPrice: string;
  costPrice: string;
  sgst: string;
  cgst: string;
  saleAdditionalDiscount: string;
  rates: PricingRate[];
  defaultRate: string;
}

/** Whether the user may change one price field (the API checks the same grant). */
export function canEditPriceField(
  field: PriceField,
  access: ShopProductSearchAccess | null | undefined,
): boolean {
  if (access && !access.canEdit) {
    return false;
  }
  return canEditProductSearchField(field, access);
}

/** True when the user may change at least one price field; the Edit price link shows only then. */
export function canEditAnyPriceField(access: ShopProductSearchAccess | null | undefined): boolean {
  return PRICE_FIELDS.some((field) => canEditPriceField(field, access));
}

function text(value: number | string | null | undefined): string {
  return value != null && String(value).trim() !== '' ? String(value) : '';
}

export function priceDraftFrom(lot: InventoryItem): PriceDraft {
  return {
    priceToRetail: text(lot.priceToRetail),
    maximumRetailPrice: text(lot.maximumRetailPrice),
    costPrice: text(lot.costPrice),
    sgst: text(lot.sgst),
    cgst: text(lot.cgst),
    saleAdditionalDiscount: text(lot.saleAdditionalDiscount),
    rates: lot.rates ?? [],
    defaultRate: lot.defaultRate ?? '',
  };
}

export interface PriceUpdate {
  payload: UpdateInventoryRequest;
  /** Form errors; nothing is sent while any remain. */
  errors: string[];
}

function amount(label: string, raw: string, errors: string[]): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a number of 0 or more`);
    return null;
  }
  return value;
}

function sameRates(a: PricingRate[], b: PricingRate[]): boolean {
  return a.length === b.length && a.every((r, i) => r.name === b[i].name && r.price === b[i].price);
}

/**
 * The update for the fields that changed. A price can be changed but not emptied, except the
 * sale additional discount, which is cleared through `clearFields`. The API validates GST and
 * the default rate and works out every derived figure.
 */
export function buildPriceUpdate(lot: InventoryItem, draft: PriceDraft): PriceUpdate {
  const errors: string[] = [];
  const payload: UpdateInventoryRequest = {};
  const before = priceDraftFrom(lot);

  const prices: ['priceToRetail' | 'maximumRetailPrice' | 'costPrice', string][] = [
    ['priceToRetail', 'PTR'],
    ['maximumRetailPrice', 'MRP'],
    ['costPrice', 'PTS'],
  ];
  for (const [field, label] of prices) {
    if (draft[field].trim() === before[field].trim()) continue;
    const value = amount(label, draft[field], errors);
    if (value == null) {
      if (draft[field].trim() === '') errors.push(`${label} cannot be empty`);
      continue;
    }
    payload[field] = value;
  }

  for (const field of ['sgst', 'cgst'] as const) {
    const next = draft[field].trim();
    if (next === before[field].trim()) continue;
    if (next === '') {
      errors.push(`${field.toUpperCase()} cannot be empty`);
      continue;
    }
    if (amount(field.toUpperCase(), next, errors) != null) payload[field] = next;
  }

  const discount = draft.saleAdditionalDiscount.trim();
  if (discount !== before.saleAdditionalDiscount.trim()) {
    if (discount === '') {
      payload.clearFields = ['saleAdditionalDiscount'];
    } else {
      const value = amount('Sale add. discount', discount, errors);
      if (value != null) payload.saleAdditionalDiscount = value;
    }
  }

  const rates = draft.rates
    .filter((r) => r.name.trim())
    .map((r) => ({ name: r.name.trim(), price: r.price }));
  if (rates.some((r) => !Number.isFinite(r.price) || r.price < 0)) {
    errors.push('Each rate needs a price of 0 or more');
  } else if (!sameRates(rates, before.rates)) {
    payload.rates = rates;
  }

  const defaultRate = draft.defaultRate.trim();
  if (defaultRate !== before.defaultRate.trim() && defaultRate !== '') {
    payload.defaultRate = defaultRate;
  }

  return { payload, errors };
}
