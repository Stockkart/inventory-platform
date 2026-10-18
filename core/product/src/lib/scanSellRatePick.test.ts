import { describe, expect, it } from 'vitest';
import type { PricingRate } from '@inventory-platform/contracts';
import {
  clearDiscountOverride,
  ratePickRequest,
  saleDiscountToSend,
  selectedRateName,
} from './scanSellRatePick';

const RULE_RATE: PricingRate = {
  name: 'Rate-A',
  price: 83.64,
  base: 'priceToRetail',
  baseValue: 100,
  discountPercent: 8,
  scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
  gstMode: 'EXCLUSIVE',
  termsText: 'PTR less 8%, 10+1',
};
const LEGACY_RATE: PricingRate = { name: 'Wholesale', price: 90 };
const SYSTEM_PTR: PricingRate = { name: 'PTR', price: 100 };

describe('clearDiscountOverride', () => {
  it('pickClearsStaleDiscountOverride', () => {
    const overrides = { 'lot-1': 5, 'lot-2': 3 };
    const next = clearDiscountOverride(overrides, 'lot-1');
    expect(next).toEqual({ 'lot-2': 3 });
    expect('lot-1' in next).toBe(false);
    // The input is left alone (React state).
    expect(overrides).toEqual({ 'lot-1': 5, 'lot-2': 3 });
  });

  it('returns the same map when the line has no override', () => {
    const overrides = { 'lot-2': 3 };
    expect(clearDiscountOverride(overrides, 'lot-1')).toBe(overrides);
  });
});

describe('ratePickRequest', () => {
  const rates = [SYSTEM_PTR, RULE_RATE, LEGACY_RATE];

  it('a rule rate sends its name only', () => {
    expect(ratePickRequest(rates, 'Rate-A')).toEqual({ rateName: 'Rate-A' });
  });

  it('a legacy rate keeps the price path', () => {
    expect(ratePickRequest(rates, 'Wholesale')).toEqual({ priceToRetail: 90 });
  });

  it('a system option never sends rateName', () => {
    expect(ratePickRequest(rates, 'PTR')).toEqual({ priceToRetail: 100 });
  });

  it('an unknown name does nothing', () => {
    expect(ratePickRequest(rates, 'Nope')).toBeNull();
  });
});

describe('saleDiscountToSend', () => {
  it('firstAddOmitsUntypedDiscount', () => {
    // The batch's own sale disc is not sent on a first add, so the backend can apply the
    // default rule rate's disc (it falls back to the batch disc itself otherwise).
    expect(saleDiscountToSend({}, 'lot-1', 5, true)).toBeUndefined();
  });

  it('first add still sends a disc the user typed', () => {
    expect(saleDiscountToSend({ 'lot-1': 4 }, 'lot-1', 5, true)).toBe(4);
  });

  it('a line already in the cart resends its own disc, as today', () => {
    expect(saleDiscountToSend({}, 'lot-1', 8, false)).toBe(8);
    expect(saleDiscountToSend({ 'lot-1': 4 }, 'lot-1', 8, false)).toBe(4);
    expect(saleDiscountToSend({}, 'lot-1', null, false)).toBeUndefined();
  });
});

describe('selectedRateName', () => {
  const rates = [SYSTEM_PTR, RULE_RATE, LEGACY_RATE];

  it('shows the picked rule rate although the line carries its base price', () => {
    expect(selectedRateName(rates, 100, 'Rate-A')).toBe('Rate-A');
  });

  it('matches non-rule options by the line price', () => {
    expect(selectedRateName(rates, 90, undefined)).toBe('Wholesale');
    expect(selectedRateName(rates, 100, undefined)).toBe('PTR');
  });

  it('never matches a rule rate by its per-unit figure', () => {
    expect(selectedRateName(rates, 83.64, undefined)).toBeUndefined();
  });

  it('ignores a picked name the line no longer offers', () => {
    expect(selectedRateName([SYSTEM_PTR], 50, 'Rate-A')).toBeUndefined();
  });
});
