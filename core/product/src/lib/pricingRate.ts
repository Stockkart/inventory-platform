import type { PricingRate } from '@inventory-platform/contracts';

/** True for a rate the server derived from a rule (legacy hand-typed rates have no base). */
export function isRuleRate(rate: PricingRate): boolean {
  return rate.base != null;
}

/** Words the API's `gstMode` for a rate. Wording only; the mode is the server's. */
export function rateGstLabel(gstMode: string | null | undefined): string | null {
  if (gstMode === 'INCLUSIVE') return 'incl. GST';
  if (gstMode === 'EXCLUSIVE') return '+ GST';
  return null;
}
