import type { PricingRate } from '@inventory-platform/contracts';
import type { CheckoutItemResponse } from '../model/types';
import { isRuleRate } from './pricingRate';

/** The batch fields the picker offers as MRP / PTR / Cost; the API's names for them. */
export type SystemRateKey = 'maximumRetailPrice' | 'priceToRetail' | 'costPrice';

const SYSTEM_RATE_LABELS: Record<SystemRateKey, string> = {
  maximumRetailPrice: 'MRP',
  priceToRetail: 'PTR',
  costPrice: 'Cost',
};

/**
 * One option of the Scan & Sell rate picker. `value` is unique within the picker: system options
 * are `system:<key>` and batch rates `rate:<name>`, so a rate named like a system option (the API
 * reserves MRP / PTR / Cost for rules) can never be mistaken for it.
 */
export interface RateOption {
  value: string;
  /** What the option shows: a system option is named MRP / PTR / Cost with the batch's price. */
  rate: PricingRate;
  /** Set on MRP / PTR / Cost; null on the batch's rates. */
  systemKey: SystemRateKey | null;
}

export interface RateOptionSource {
  maximumRetailPrice?: number | null;
  priceToRetail?: number | null;
  costPrice?: number | null;
  rates?: PricingRate[] | null;
}

/**
 * The picker's options: MRP, PTR and Cost (cost only when above 0, as before rate rules) with the
 * batch's prices, then the batch's rates as the API sent them (rule rates keep their terms).
 */
export function buildRateOptions(source: RateOptionSource): RateOption[] {
  const options: RateOption[] = [];
  const system = (key: SystemRateKey, price: number) =>
    options.push({
      value: `system:${key}`,
      rate: { name: SYSTEM_RATE_LABELS[key], price },
      systemKey: key,
    });
  if (source.maximumRetailPrice != null) system('maximumRetailPrice', source.maximumRetailPrice);
  if (source.priceToRetail != null) system('priceToRetail', source.priceToRetail);
  if (source.costPrice != null && source.costPrice > 0) system('costPrice', source.costPrice);
  for (const rate of source.rates ?? []) {
    const name = rate?.name?.trim();
    if (name && rate.price != null) {
      options.push({ value: `rate:${name}`, rate: { ...rate, name }, systemKey: null });
    }
  }
  return options;
}

/**
 * What a Scan & Sell rate pick sends for the line. With rate rules on (`features.rateRules`),
 * MRP / PTR / Cost send their system name (`priceToRetail` …): the cart puts that batch field on
 * the line, per sale unit; a line at a rule rate goes back to the batch's own sale disc and
 * scheme, any other line keeps its own. A shop without rules sends the option's batch price
 * (`priceToRetail`), as before rate rules. A rule rate (one with a base) sends its name: the cart
 * puts the base, disc and scheme on the line. A legacy hand-typed rate keeps the price path.
 */
export type RatePickRequest = { rateName: string } | { priceToRetail: number };

export function ratePickRequest(
  options: RateOption[],
  value: string,
  rateRules: boolean,
): RatePickRequest | null {
  const option = options.find((o) => o.value === value);
  if (!option) return null;
  if (option.systemKey) {
    return rateRules ? { rateName: option.systemKey } : { priceToRetail: option.rate.price };
  }
  return isRuleRate(option.rate)
    ? { rateName: option.rate.name }
    : { priceToRetail: option.rate.price };
}

/**
 * The rate name the page remembers for a pick (`pickedRateNames`, the fallback for an API without
 * `appliedRateName`): only a rule rate's name. MRP / PTR / Cost and legacy rates give null, so a
 * system key is never stored as a picked rate.
 */
export function pickedRuleRateName(options: RateOption[], value: string): string | null {
  const option = options.find((o) => o.value === value);
  if (!option || option.systemKey || !isRuleRate(option.rate)) return null;
  return option.rate.name;
}

/**
 * Each line's `appliedRateName` from the cart response, by inventory id. Lines whose response has
 * no such field (an API without it) are left out, so the picker can fall back for them.
 */
export function appliedRateNamesByLine(
  items: readonly CheckoutItemResponse[] | null | undefined,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const item of items ?? []) {
    if (item.inventoryId && item.appliedRateName !== undefined) {
      out[item.inventoryId] = item.appliedRateName;
    }
  }
  return out;
}

/**
 * Drops a line's typed disc after a rate pick, so the next sync does not resend it over the
 * disc the rate put on the line. Returns the same map when the line has none.
 */
export function clearDiscountOverride(
  overrides: Record<string, number | null>,
  inventoryId: string,
): Record<string, number | null> {
  if (!(inventoryId in overrides)) return overrides;
  const next = { ...overrides };
  delete next[inventoryId];
  return next;
}

/**
 * A cart line's sale disc after a cart response. A null from the cart is a cleared disc (a PTR /
 * MRP / Cost pick drops a rule rate's disc) and replaces the line's; only a response without the
 * field keeps the line's own.
 */
export function lineSaleDiscountFromResponse(
  responseDiscount: number | null | undefined,
  lineDiscount: number | null | undefined,
): number | null {
  return responseDiscount !== undefined ? responseDiscount : lineDiscount ?? null;
}

/**
 * The sale disc a cart sync sends for a line: the one the user typed, else the line's own. A lot
 * new to the cart sends only a typed disc; the backend fills in the batch's (or its default rule
 * rate's) disc itself, and a disc sent on a first add would stop the rate's from applying.
 */
export function saleDiscountToSend(
  overrides: Record<string, number | null>,
  inventoryId: string,
  lineDiscount: number | null | undefined,
  isNewLine: boolean,
): number | undefined {
  const typed = overrides[inventoryId];
  if (typed != null) return typed;
  if (isNewLine) return undefined;
  return lineDiscount ?? undefined;
}

/**
 * Which option the picker shows for a line. The cart's `appliedRateName` decides when the API
 * sent it: a system key shows MRP / PTR / Cost, a rate name shows that rate. Without it (an older
 * API) a rule rate picked on this page is shown by name. Otherwise a system or legacy option
 * whose price is the line's; rule rates are never matched by price (the line carries the base).
 */
export function selectedRateValue(
  options: RateOption[],
  linePrice: number,
  appliedRateName: string | null | undefined,
  pickedName?: string,
): string | undefined {
  if (appliedRateName) {
    const applied = options.find((o) =>
      o.systemKey ? o.systemKey === appliedRateName : o.rate.name === appliedRateName,
    );
    if (applied) return applied.value;
  } else if (appliedRateName === undefined && pickedName) {
    const picked = options.find(
      (o) => !o.systemKey && o.rate.name === pickedName && isRuleRate(o.rate),
    );
    if (picked) return picked.value;
  }
  return options.find(
    (o) => (o.systemKey || !isRuleRate(o.rate)) && Math.abs(o.rate.price - linePrice) < 0.01,
  )?.value;
}

/**
 * Keeps only the picked rate names whose line is still in the cart (the fallback for an API
 * without `appliedRateName`), so a line that was
 * removed, set to zero, checked out or left behind by a quotation switch does not carry its pick
 * into a later add of the same lot. Returns the same map when nothing is dropped.
 */
export function prunePickedRateNames(
  picked: Record<string, string>,
  lineIds: Iterable<string>,
): Record<string, string> {
  const keep = new Set(lineIds);
  const stale = Object.keys(picked).filter((id) => !keep.has(id));
  if (stale.length === 0) return picked;
  const next = { ...picked };
  for (const id of stale) delete next[id];
  return next;
}
