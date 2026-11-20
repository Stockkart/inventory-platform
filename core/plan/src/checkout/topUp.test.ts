import { describe, expect, it } from 'vitest';
import type { AddOnResponse, PlanResponse } from '@inventory-platform/plan/types';
import {
  addOnGrantLabel,
  addOnOnlyPaymentPath,
  canBuyAddOnsAlone,
  isComingSoonAddOn,
  readAddOnOnlyIntent,
  topUpAddOns,
} from './topUp';

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

const growth: PlanResponse = {
  id: 'g',
  planName: 'Growth',
  price: 0,
  arcPrice: 9999,
  billingLimit: null,
  billCountLimit: null,
  smsLimit: null,
  whatsappLimit: null,
  userLimit: 5,
  unlimited: false,
  linkedId: null,
  bestFor: null,
  code: 'GROWTH',
  features: ['CREDIT_BALANCE', 'ACCOUNTING'],
};

const active = { trial: false, planExpired: false, plan: growth };

describe('canBuyAddOnsAlone', () => {
  it('is true only on an active paid plan', () => {
    expect(canBuyAddOnsAlone(active)).toBe(true);
  });

  it('is false on a trial, an expired plan, or no plan', () => {
    expect(canBuyAddOnsAlone({ ...active, trial: true })).toBe(false);
    expect(canBuyAddOnsAlone({ ...active, planExpired: true })).toBe(false);
    expect(canBuyAddOnsAlone({ ...active, plan: null })).toBe(false);
  });
});

describe('topUpAddOns', () => {
  const accounting = addOn({ code: 'ACC', grantsFeature: 'ACCOUNTING' });
  const salary = addOn({ code: 'SAL', grantsFeature: 'SALARY' });
  const seat = addOn({ code: 'SEAT', grantType: 'SEATS', grantsQuantity: 1, stackable: true });
  const sms = addOn({ code: 'SMS500', grantType: 'SMS', grantsQuantity: 500 });

  it('hides feature add-ons the current plan already includes', () => {
    expect(topUpAddOns([accounting, salary, seat, sms], active).map((a) => a.code)).toEqual([
      'SAL',
      'SEAT',
      'SMS500',
    ]);
  });

  it('hides seats on an unlimited plan', () => {
    const unlimited = { ...active, plan: { ...growth, unlimited: true } };
    expect(topUpAddOns([seat, salary], unlimited).map((a) => a.code)).toEqual(['SAL']);
  });

  it('offers nothing when add-ons cannot be bought alone', () => {
    expect(topUpAddOns([salary], { ...active, trial: true })).toEqual([]);
  });
});

describe('isComingSoonAddOn', () => {
  it('marks SMS packs only', () => {
    expect(isComingSoonAddOn(addOn({ grantType: 'SMS' }))).toBe(true);
    expect(isComingSoonAddOn(addOn({ grantType: 'OCR_CREDITS' }))).toBe(false);
  });
});

describe('addOnGrantLabel', () => {
  it('says what one unit gives', () => {
    expect(addOnGrantLabel(addOn({ grantType: 'SEATS', grantsQuantity: 1 }))).toBe('+1 user');
    expect(addOnGrantLabel(addOn({ grantType: 'SEATS', grantsQuantity: 3 }))).toBe('+3 users');
    expect(addOnGrantLabel(addOn({ grantType: 'OCR_CREDITS', grantsQuantity: 1500 }))).toBe(
      '1,500 OCR credits',
    );
    expect(addOnGrantLabel(addOn({ grantsFeature: 'SALARY' }))).toBe('Unlocks Staff salary');
    expect(addOnGrantLabel(addOn({ grantType: 'SMS', grantsQuantity: 500 }))).toBe('500 SMS');
  });

  it('is null for a feature add-on with no feature', () => {
    expect(addOnGrantLabel(addOn({}))).toBeNull();
  });
});

describe('add-on-only payment link', () => {
  it('round-trips code and quantity with no planId', () => {
    const path = addOnOnlyPaymentPath({ code: 'SEAT', quantity: 3 });
    expect(path).toBe('/dashboard/plan-payment?addOn=SEAT&qty=3');
    const params = new URL(path, 'https://app.test').searchParams;
    expect(readAddOnOnlyIntent(params)).toEqual({ code: 'SEAT', quantity: 3 });
  });

  it('reads a missing or bad quantity as 1', () => {
    expect(readAddOnOnlyIntent(new URLSearchParams('addOn=OCR'))).toEqual({
      code: 'OCR',
      quantity: 1,
    });
    expect(readAddOnOnlyIntent(new URLSearchParams('addOn=OCR&qty=0'))?.quantity).toBe(1);
    expect(readAddOnOnlyIntent(new URLSearchParams('addOn=OCR&qty=abc'))?.quantity).toBe(1);
  });

  it('is the plan flow whenever a planId is present, or no add-on is named', () => {
    expect(readAddOnOnlyIntent(new URLSearchParams('planId=p1&addOn=SEAT'))).toBeNull();
    expect(readAddOnOnlyIntent(new URLSearchParams('qty=2'))).toBeNull();
  });
});
