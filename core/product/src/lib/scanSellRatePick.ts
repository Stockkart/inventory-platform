import type { PricingRate } from '@inventory-platform/contracts';
import { isRuleRate } from './pricingRate';

/**
 * What a Scan & Sell rate pick sends for the line. A rule rate (one the server derived, with a
 * base) sends only its name: the cart puts the base, disc and scheme on the line. System options
 * (MRP / PTR / Cost) and legacy hand-typed rates keep the price path, so no system name is ever
 * sent as `rateName`.
 */
export type RatePickRequest = { rateName: string } | { priceToRetail: number };

export function ratePickRequest(rates: PricingRate[], name: string): RatePickRequest | null {
  const rate = rates.find((r) => r.name === name);
  if (!rate) return null;
  return isRuleRate(rate) ? { rateName: rate.name } : { priceToRetail: rate.price };
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
 * Which option the picker shows for a line. A picked rule rate is shown by name (the line carries
 * its base price, not its per-unit figure); otherwise a system or legacy option whose price is
 * the line's. Rule rates are never matched by price.
 */
export function selectedRateName(
  rates: PricingRate[],
  linePrice: number,
  pickedName: string | undefined,
): string | undefined {
  if (pickedName && rates.some((r) => r.name === pickedName && isRuleRate(r))) {
    return pickedName;
  }
  return rates.find((r) => !isRuleRate(r) && Math.abs(r.price - linePrice) < 0.01)?.name;
}
