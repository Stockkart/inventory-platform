import { describe, expect, it } from 'vitest';
import type { PricingRate } from '@inventory-platform/contracts';
import type { CheckoutItemResponse } from '../model/types';
import {
  appliedRateNamesByLine,
  buildRateOptions,
  clearDiscountOverride,
  lineSaleDiscountFromResponse,
  pickedRuleRateName,
  prunePickedRateNames,
  ratePickRequest,
  saleDiscountToSend,
  selectedRateValue,
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
const OPTIONS = buildRateOptions({
  maximumRetailPrice: 120,
  priceToRetail: 100,
  costPrice: 70,
  rates: [RULE_RATE, LEGACY_RATE],
});

describe('buildRateOptions', () => {
  it('gives system options values that cannot clash with rate names', () => {
    const options = buildRateOptions({
      priceToRetail: 100,
      rates: [
        { name: 'PTR', price: 95 },
        { name: 'priceToRetail', price: 94 },
      ],
    });
    expect(options.map((o) => o.value)).toEqual([
      'system:priceToRetail',
      'rate:PTR',
      'rate:priceToRetail',
    ]);
    expect(new Set(options.map((o) => o.value)).size).toBe(3);
    expect(options[0]).toMatchObject({
      systemKey: 'priceToRetail',
      rate: { name: 'PTR', price: 100 },
    });
    expect(options[1].systemKey).toBeNull();
  });

  it('lists MRP, PTR, Cost then the batch rates, and leaves out a zero cost', () => {
    expect(OPTIONS.map((o) => o.rate.name)).toEqual(['MRP', 'PTR', 'Cost', 'Rate-A', 'Wholesale']);
    expect(buildRateOptions({ priceToRetail: 100, costPrice: 0 }).map((o) => o.rate.name)).toEqual([
      'PTR',
    ]);
  });
});

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
  it('a rule rate sends its name only', () => {
    expect(ratePickRequest(OPTIONS, 'rate:Rate-A', true)).toEqual({ rateName: 'Rate-A' });
  });

  it('a legacy rate keeps the price path', () => {
    expect(ratePickRequest(OPTIONS, 'rate:Wholesale', true)).toEqual({ priceToRetail: 90 });
    expect(ratePickRequest(OPTIONS, 'rate:Wholesale', false)).toEqual({ priceToRetail: 90 });
  });

  it('rulesShopPtrPickSendsSystemName', () => {
    expect(ratePickRequest(OPTIONS, 'system:priceToRetail', true)).toEqual({
      rateName: 'priceToRetail',
    });
    expect(ratePickRequest(OPTIONS, 'system:maximumRetailPrice', true)).toEqual({
      rateName: 'maximumRetailPrice',
    });
    expect(ratePickRequest(OPTIONS, 'system:costPrice', true)).toEqual({ rateName: 'costPrice' });
  });

  it('noRulesShopPtrPickSendsBatchPrice', () => {
    // A shop without rate rules sends what main sent: the batch field's value as the price.
    expect(ratePickRequest(OPTIONS, 'system:priceToRetail', false)).toEqual({
      priceToRetail: 100,
    });
    expect(ratePickRequest(OPTIONS, 'system:maximumRetailPrice', false)).toEqual({
      priceToRetail: 120,
    });
    expect(ratePickRequest(OPTIONS, 'system:costPrice', false)).toEqual({ priceToRetail: 70 });
  });

  it('pickRuleRateThenPtrSendsSystemName', () => {
    expect(ratePickRequest(OPTIONS, 'rate:Rate-A', true)).toEqual({ rateName: 'Rate-A' });
    expect(ratePickRequest(OPTIONS, 'system:priceToRetail', true)).toEqual({
      rateName: 'priceToRetail',
    });
  });

  it('an unknown value sends nothing', () => {
    expect(ratePickRequest(OPTIONS, 'rate:Nope', true)).toBeNull();
    expect(ratePickRequest(OPTIONS, 'PTR', false)).toBeNull();
  });
});

describe('pickedRuleRateName', () => {
  it('systemPickNotStored', () => {
    expect(pickedRuleRateName(OPTIONS, 'system:priceToRetail')).toBeNull();
    expect(pickedRuleRateName(OPTIONS, 'system:maximumRetailPrice')).toBeNull();
    expect(pickedRuleRateName(OPTIONS, 'system:costPrice')).toBeNull();
  });

  it('remembers a rule rate only', () => {
    expect(pickedRuleRateName(OPTIONS, 'rate:Rate-A')).toBe('Rate-A');
    expect(pickedRuleRateName(OPTIONS, 'rate:Wholesale')).toBeNull();
    expect(pickedRuleRateName(OPTIONS, 'rate:Nope')).toBeNull();
  });
});

describe('appliedRateNamesByLine', () => {
  it('maps lines that carry the field, null included, and skips lines without it', () => {
    const line = (inventoryId: string, extra: Partial<CheckoutItemResponse>) =>
      ({ inventoryId, ...extra } as CheckoutItemResponse);
    expect(
      appliedRateNamesByLine([
        line('a', { appliedRateName: 'Rate-A' }),
        line('b', { appliedRateName: null }),
        line('c', {}),
      ]),
    ).toEqual({ a: 'Rate-A', b: null });
    expect(appliedRateNamesByLine(null)).toEqual({});
  });
});

describe('lineSaleDiscountFromResponse', () => {
  it('a disc the cart cleared clears the line, so PTR after Rate-A does not keep the 5%', () => {
    expect(lineSaleDiscountFromResponse(null, 5)).toBeNull();
  });

  it('takes the cart disc when it sent one', () => {
    expect(lineSaleDiscountFromResponse(7, 5)).toBe(7);
    expect(lineSaleDiscountFromResponse(0, 5)).toBe(0);
  });

  it('keeps the line disc when the response has no such field', () => {
    expect(lineSaleDiscountFromResponse(undefined, 5)).toBe(5);
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

describe('selectedRateValue', () => {
  it('follows the cart line appliedRateName for a rule rate', () => {
    expect(selectedRateValue(OPTIONS, 100, 'Rate-A')).toBe('rate:Rate-A');
  });

  it('shows PTR from appliedRateName on a line whose price is per tablet', () => {
    // Rate-A then PTR on a strip-of-10 line: the cart bills 10.00 per tablet, not the pack's 100.
    expect(selectedRateValue(OPTIONS, 10, 'priceToRetail', 'Rate-A')).toBe('system:priceToRetail');
  });

  it('prefers appliedRateName over a local pick', () => {
    expect(selectedRateValue(OPTIONS, 100, 'priceToRetail', 'Rate-A')).toBe('system:priceToRetail');
  });

  it('a cleared appliedRateName (manual edit) falls back to price matching, not the local pick', () => {
    expect(selectedRateValue(OPTIONS, 90, null, 'Rate-A')).toBe('rate:Wholesale');
    expect(selectedRateValue(OPTIONS, 55, null, 'Rate-A')).toBeUndefined();
  });

  it('without appliedRateName (older API) shows the rule rate picked here', () => {
    expect(selectedRateValue(OPTIONS, 100, undefined, 'Rate-A')).toBe('rate:Rate-A');
  });

  it('matches non-rule options by the line price', () => {
    expect(selectedRateValue(OPTIONS, 90, undefined)).toBe('rate:Wholesale');
    expect(selectedRateValue(OPTIONS, 100, undefined)).toBe('system:priceToRetail');
  });

  it('never matches a rule rate by its per-unit figure', () => {
    expect(selectedRateValue(OPTIONS, 83.64, undefined)).toBeUndefined();
  });

  it('ignores an applied or picked name the line no longer offers', () => {
    const ptrOnly = buildRateOptions({ priceToRetail: 100 });
    expect(selectedRateValue(ptrOnly, 50, undefined, 'Rate-A')).toBeUndefined();
    expect(selectedRateValue(ptrOnly, 50, 'Rate-A')).toBeUndefined();
  });
});

describe('prunePickedRateNames', () => {
  it('drops picks for lines no longer in the cart', () => {
    expect(prunePickedRateNames({ a: 'Rate-A', b: 'Rate-B' }, ['b', 'c'])).toEqual({
      b: 'Rate-B',
    });
  });

  it('clears every pick when the cart is empty (checkout, clear, quotation switch)', () => {
    expect(prunePickedRateNames({ a: 'Rate-A' }, [])).toEqual({});
  });

  it('returns the same map when nothing is dropped', () => {
    const picked = { a: 'Rate-A' };
    expect(prunePickedRateNames(picked, ['a', 'b'])).toBe(picked);
  });
});
