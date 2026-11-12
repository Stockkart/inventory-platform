import { canEditProductSearchField } from '@inventory-platform/access';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import type { PricingRate } from '@inventory-platform/contracts';
import type { InventoryItem, UpdateInventoryRequest } from '@inventory-platform/product/types';
import { isRuleRate } from './pricingRate';
import { sameRateTerms } from './rateTerms';

/**
 * Price fields of a lot. They are edited on the Edit price page only (not in the product search
 * Edit dialog). The single prices are saved through `PUT /inventory/{id}`, which applies the
 * product-search grants; the rates and default rate through `PATCH /pricing/{id}`, which also
 * takes rule-rate resets and answers with the rates' warnings and default-rate choices.
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

/** The Edit price form's single prices, as typed. Rates are a {@link RatesDraft}. */
export interface PriceDraft {
  priceToRetail: string;
  maximumRetailPrice: string;
  costPrice: string;
  sgst: string;
  cgst: string;
  saleAdditionalDiscount: string;
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

/**
 * The `PUT /inventory/{id}` update for the single prices that changed. A price can be changed but
 * not emptied, except the sale additional discount, which is cleared through `clearFields`. The
 * API validates GST and works out every derived figure.
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

  return { payload, errors };
}

/** The rates part of the Edit price form. */
export interface RatesDraft {
  rates: PricingRate[];
  defaultRate: string;
  /** Rule rates to regenerate from their rule on save. */
  resetNames: string[];
}

/** The `PATCH /pricing/{id}` body for the rates part; same shape as the pricing package's DTO. */
export interface RatesPatch {
  rates?: PricingRate[];
  defaultRate?: string;
  resetRates?: string[];
}

export interface RatesUpdate {
  /** Null when nothing in the rates part changed, so no pricing write is made. */
  payload: RatesPatch | null;
  errors: string[];
}

function sameRate(a: PricingRate, b: PricingRate | undefined): boolean {
  return (
    b !== undefined &&
    a.name === b.name &&
    a.price === b.price &&
    isRuleRate(a) === isRuleRate(b) &&
    (!isRuleRate(a) || sameRateTerms(a, b))
  );
}

/**
 * The `PATCH /pricing/{id}` update for the rates part, only when it changed: the full rate list
 * (a hand-typed rate as name and price; a rule rate as it is, with its new terms, for the server
 * to reprice), the default rate, and the rule rates to reset. Rows without a name are dropped.
 * `allowedDefaultRates` is the server's `defaultRateOptions`.
 */
export function buildRatesUpdate(
  saved: { rates: PricingRate[]; defaultRate: string },
  draft: RatesDraft,
  allowedDefaultRates: readonly string[],
): RatesUpdate {
  const errors: string[] = [];
  const payload: RatesPatch = {};

  const rates = draft.rates
    .filter((r) => r.name.trim())
    .map((r) => (isRuleRate(r) ? r : { name: r.name.trim(), price: r.price }));
  if (rates.some((r) => !Number.isFinite(r.price) || r.price < 0)) {
    errors.push('Each rate needs a price of 0 or more');
  } else if (
    rates.length !== saved.rates.length ||
    rates.some((r, i) => !sameRate(r, saved.rates[i]))
  ) {
    payload.rates = rates;
  }

  const defaultRate = draft.defaultRate.trim();
  if (defaultRate !== saved.defaultRate.trim() && defaultRate !== '') {
    if (allowedDefaultRates.includes(defaultRate)) {
      payload.defaultRate = defaultRate;
    } else {
      errors.push('Choose a default rate from the list');
    }
  }

  if (draft.resetNames.length > 0) payload.resetRates = [...draft.resetNames];

  return { payload: Object.keys(payload).length > 0 ? payload : null, errors };
}
