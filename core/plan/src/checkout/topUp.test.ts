import { describe, expect, it } from 'vitest';
import type { AddOnResponse } from '@inventory-platform/plan/types';
import {
  addOnGrantLabel,
  addOnOnlyPaymentPath,
  canBuyAddOnsAlone,
  formatTermEnd,
  isComingSoonAddOn,
  readAddOnOnlyIntent,
  resolveAddOnOnlyIntent,
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

const active = { canBuyAddOnsAlone: true };
const notPaid = { canBuyAddOnsAlone: false };

describe('canBuyAddOnsAlone', () => {
  it('follows the API flag', () => {
    expect(canBuyAddOnsAlone(active)).toBe(true);
    expect(canBuyAddOnsAlone(notPaid)).toBe(false);
  });

  it('is false on an older API without the flag', () => {
    expect(canBuyAddOnsAlone({})).toBe(false);
  });
});

describe('topUpAddOns', () => {
  const salary = addOn({ code: 'SAL', grantsFeature: 'SALARY', eligible: true });
  const accounting = addOn({
    code: 'ACC',
    grantsFeature: 'ACCOUNTING',
    eligible: false,
    ineligibleReason: 'Your plan already includes this.',
  });
  const seat = addOn({ code: 'SEAT', grantType: 'SEATS', stackable: true, eligible: true });

  it('offers only what the API marks eligible', () => {
    expect(topUpAddOns([accounting, salary, seat], active).map((a) => a.code)).toEqual([
      'SAL',
      'SEAT',
    ]);
  });

  it('offers nothing when add-ons cannot be bought alone', () => {
    expect(topUpAddOns([salary], notPaid)).toEqual([]);
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

  it('names the add-on when the feature has no label in this build', () => {
    const future = addOn({
      name: 'Loyalty points',
      grantsFeature: 'LOYALTY' as AddOnResponse['grantsFeature'],
    });
    expect(addOnGrantLabel(future)).toBe('Unlocks Loyalty points');
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

describe('resolveAddOnOnlyIntent', () => {
  const salary = addOn({ code: 'SAL', grantsFeature: 'SALARY', eligible: true });
  const accounting = addOn({ code: 'ACC', grantsFeature: 'ACCOUNTING', eligible: false });
  const seat = addOn({
    code: 'SEAT',
    grantType: 'SEATS',
    grantsQuantity: 1,
    stackable: true,
    maxQuantity: 5,
    eligible: true,
  });
  const sms = addOn({ code: 'SMS500', grantType: 'SMS', grantsQuantity: 500, eligible: true });
  const options = [salary, accounting, seat, sms];

  it('waits for plan status, then for the add-on options', () => {
    const intent = { code: 'SAL', quantity: 1 };
    expect(resolveAddOnOnlyIntent(intent, options, undefined)).toEqual({ kind: 'loading' });
    expect(resolveAddOnOnlyIntent(intent, undefined, active)).toEqual({ kind: 'loading' });
  });

  it('refuses a shop that cannot buy add-ons alone before looking at the add-on', () => {
    expect(resolveAddOnOnlyIntent({ code: 'SAL', quantity: 1 }, undefined, notPaid)).toEqual({
      kind: 'planNotEligible',
    });
  });

  it('seeds the cart with a buyable add-on', () => {
    expect(resolveAddOnOnlyIntent({ code: 'SAL', quantity: 1 }, options, active)).toEqual({
      kind: 'ready',
      selection: { SAL: 1 },
    });
  });

  it('holds the quantity to the stepper cap', () => {
    expect(resolveAddOnOnlyIntent({ code: 'SEAT', quantity: 40 }, options, active)).toEqual({
      kind: 'ready',
      selection: { SEAT: 5 },
    });
    expect(resolveAddOnOnlyIntent({ code: 'SAL', quantity: 3 }, options, active)).toEqual({
      kind: 'ready',
      selection: { SAL: 1 },
    });
  });

  it('refuses an add-on the API marks ineligible, a coming-soon pack, or an unknown code', () => {
    for (const code of ['ACC', 'SMS500', 'NOPE']) {
      expect(resolveAddOnOnlyIntent({ code, quantity: 1 }, options, active)).toEqual({
        kind: 'unavailable',
      });
    }
  });
});

describe('formatTermEnd', () => {
  it('shows the Indian calendar day of the term end', () => {
    expect(formatTermEnd('2027-03-31T10:00:00Z')).toBe('31 Mar 2027');
    // 20:00 UTC on the 31st is already 1 April in India.
    expect(formatTermEnd('2027-03-31T20:00:00Z')).toBe('1 Apr 2027');
  });

  it('is null when the API sends nothing usable', () => {
    expect(formatTermEnd(undefined)).toBeNull();
    expect(formatTermEnd(null)).toBeNull();
    expect(formatTermEnd('not a date')).toBeNull();
  });
});
