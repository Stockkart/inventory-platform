import type { PricingRate } from '@inventory-platform/contracts';

type Scheme = PricingRate['scheme'];

function same<T>(a: T | null | undefined, b: T | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

function sameScheme(a: Scheme | undefined, b: Scheme | undefined): boolean {
  return (
    same(a?.schemeType, b?.schemeType) &&
    same(a?.schemePayFor, b?.schemePayFor) &&
    same(a?.schemeFree, b?.schemeFree) &&
    same(a?.schemePercentage, b?.schemePercentage)
  );
}

/**
 * Whether two rates carry the same override terms (discount % and scheme), field by field.
 * Null and absent count as equal, and so do no scheme and an all-empty one; key order never
 * matters. A comparison only: nothing is worked out.
 */
export function sameRateTerms(
  a: Pick<PricingRate, 'discountPercent' | 'scheme'> | undefined,
  b: Pick<PricingRate, 'discountPercent' | 'scheme'> | undefined,
): boolean {
  return same(a?.discountPercent, b?.discountPercent) && sameScheme(a?.scheme, b?.scheme);
}
