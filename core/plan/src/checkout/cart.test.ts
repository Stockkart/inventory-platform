import { describe, expect, it } from 'vitest';
import { ApiError } from '@inventory-platform/api-client';
import type { AddOnResponse, PlanResponse } from '@inventory-platform/plan/types';
import {
  addOnPriceLabel,
  buildQuoteRequest,
  maxQuantityFor,
  normaliseVoucherCode,
  readVoucherRejection,
  sellableAddOns,
} from './cart';

function addOn(overrides: Partial<AddOnResponse>): AddOnResponse {
  return {
    code: 'X',
    name: 'X',
    description: null,
    price: 1000,
    billingType: 'ANNUAL',
    grantType: 'FEATURE',
    grantsFeature: null,
    grantsQuantity: null,
    stackable: false,
    maxQuantity: null,
    displayOrder: null,
    ...overrides,
  };
}

const plan = {
  id: 'p1',
  planName: 'Growth',
  code: 'GROWTH',
  unlimited: false,
  features: ['ACCOUNTING'],
} as PlanResponse;

describe('sellableAddOns', () => {
  const accounting = addOn({ code: 'ACC', grantsFeature: 'ACCOUNTING' });
  const salary = addOn({ code: 'SAL', grantsFeature: 'SALARY' });
  const seats = addOn({ code: 'SEAT', grantType: 'SEATS', stackable: true });

  it('hides features the plan already includes', () => {
    expect(sellableAddOns([accounting, salary, seats], plan).map((a) => a.code)).toEqual([
      'SAL',
      'SEAT',
    ]);
  });

  it('hides extra seats on unlimited plans', () => {
    const unlimited = { ...plan, unlimited: true };
    expect(sellableAddOns([salary, seats], unlimited).map((a) => a.code)).toEqual(['SAL']);
  });
});

describe('maxQuantityFor', () => {
  it('is 1 unless stackable, and caps uncapped stackables', () => {
    expect(maxQuantityFor(addOn({ stackable: false, maxQuantity: 5 }))).toBe(1);
    expect(maxQuantityFor(addOn({ stackable: true, maxQuantity: 5 }))).toBe(5);
    expect(maxQuantityFor(addOn({ stackable: true }))).toBe(99);
  });
});

describe('addOnPriceLabel', () => {
  it('labels annual and one-time prices', () => {
    expect(addOnPriceLabel(addOn({ price: 2999 }))).toBe('₹2,999 / year');
    expect(addOnPriceLabel(addOn({ price: 499, billingType: 'ONE_TIME' }))).toBe('₹499 one-time');
  });
});

describe('buildQuoteRequest', () => {
  it('drops zero quantities, sorts, and omits empty parts', () => {
    expect(buildQuoteRequest('GROWTH', { SAL: 0 }, [])).toEqual({
      planCode: 'GROWTH',
      durationMonths: 12,
    });
    expect(buildQuoteRequest('GROWTH', { SEAT: 2, ACC: 1, SAL: 0 }, ['B', 'A'])).toEqual({
      planCode: 'GROWTH',
      durationMonths: 12,
      addOns: [
        { code: 'ACC', quantity: 1 },
        { code: 'SEAT', quantity: 2 },
      ],
      voucherCodes: ['A', 'B'],
    });
  });
});

describe('normaliseVoucherCode', () => {
  it('trims and upper-cases like the server', () => {
    expect(normaliseVoucherCode('  diwali-ab12 ')).toBe('DIWALI-AB12');
  });
});

describe('readVoucherRejection', () => {
  it('reads the code and reason from a VOUCHER_REJECTED error', () => {
    const error = new ApiError('Voucher X is exhausted', {
      status: 400,
      code: 'VOUCHER_REJECTED',
      details: { voucherCode: 'X', reason: 'EXHAUSTED' },
    });
    expect(readVoucherRejection(error)).toEqual({
      voucherCode: 'X',
      message: 'This voucher has been fully used.',
    });
  });

  it('ignores other errors', () => {
    expect(readVoucherRejection(new ApiError('bad', { status: 400 }))).toBeNull();
    expect(readVoucherRejection(new Error('boom'))).toBeNull();
  });
});
