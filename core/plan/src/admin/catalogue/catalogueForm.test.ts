import { describe, expect, it } from 'vitest';
import type { AdminAddOn, AdminPlan } from '@inventory-platform/plan/types';
import {
  addOnFormState,
  describeAddOnGrant,
  emptyAddOnForm,
  emptyGrantForm,
  emptyPlanForm,
  emptyPlanGrantForm,
  planGrantOptions,
  planFormState,
  toAddOnRequest,
  toGrantRequest,
  toPlanGrantRequest,
  toPlanRequest,
} from './catalogueForm';

const plan: AdminPlan = {
  id: 'p1',
  code: 'GROWTH',
  planName: 'Growth',
  price: 0,
  arcPrice: 4999,
  basePrice: 3999,
  billingLimit: null,
  billCountLimit: 5000,
  smsLimit: 500,
  whatsappLimit: null,
  userLimit: 3,
  ocrLimit: 50,
  unlimited: false,
  features: ['MARKETING', 'ACCOUNTING'],
  displayOrder: 2,
  badge: 'MOST_POPULAR',
  bestFor: 'Growing shops',
  linkedId: 'p2',
  active: true,
};

const addOn: AdminAddOn = {
  id: 'a1',
  code: 'EXTRA_SEAT',
  name: 'Extra user',
  description: null,
  price: 999,
  billingType: 'ANNUAL',
  grantType: 'SEATS',
  grantsFeature: null,
  grantsQuantity: 1,
  stackable: true,
  maxQuantity: 10,
  displayOrder: 1,
  active: true,
  createdAt: null,
  updatedAt: null,
};

describe('toPlanRequest', () => {
  it('round-trips an existing plan, sending every field', () => {
    const result = toPlanRequest(planFormState(plan), plan.id);
    expect(result).toEqual({
      ok: true,
      request: {
        code: 'GROWTH',
        planName: 'Growth',
        arcPrice: 4999,
        basePrice: 3999,
        price: 0,
        billingLimit: null,
        billCountLimit: 5000,
        smsLimit: 500,
        whatsappLimit: null,
        userLimit: 3,
        ocrLimit: 50,
        unlimited: false,
        features: ['ACCOUNTING', 'MARKETING'],
        displayOrder: 2,
        badge: 'MOST_POPULAR',
        bestFor: 'Growing shops',
        linkedId: 'p2',
      },
    });
  });

  it('reports the rules the server would reject', () => {
    const result = toPlanRequest(
      {
        ...emptyPlanForm(),
        code: '1BAD',
        arcPrice: '12.345',
        basePrice: '1.234',
        userLimit: '0',
        smsLimit: '-1',
        displayOrder: '1001',
        badge: 'most popular',
      },
      null,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      [
        'arcPrice',
        'basePrice',
        'badge',
        'code',
        'displayOrder',
        'planName',
        'smsLimit',
        'userLimit',
      ].sort(),
    );
  });

  it('sends an empty base price as null, meaning no floor', () => {
    const result = toPlanRequest({ ...planFormState(plan), basePrice: ' ' }, plan.id);
    expect(result.ok && result.request.basePrice).toBeNull();
  });

  it('blocks a plan from upselling to itself', () => {
    const result = toPlanRequest({ ...planFormState(plan), linkedId: plan.id }, plan.id);
    expect(result).toEqual({ ok: false, errors: { linkedId: expect.any(String) } });
  });
});

describe('toAddOnRequest', () => {
  it('round-trips an existing add-on', () => {
    const result = toAddOnRequest(addOnFormState(addOn), false);
    expect(result.ok && result.request).toMatchObject({
      code: 'EXTRA_SEAT',
      grantType: 'SEATS',
      grantsFeature: null,
      grantsQuantity: 1,
      stackable: true,
      maxQuantity: 10,
    });
  });

  it('leaves billing, and pack size and stacking of a feature, to the API', () => {
    const credits = toAddOnRequest(
      {
        ...emptyAddOnForm(),
        code: 'OCR_100',
        name: 'OCR 100',
        price: '199',
        grantType: 'OCR_CREDITS',
        grantsQuantity: '100',
      },
      true,
    );
    expect(credits.ok && credits.request).not.toHaveProperty('billingType');
    expect(credits.ok && credits.request.grantsQuantity).toBe(100);

    const feature = toAddOnRequest(
      {
        ...emptyAddOnForm(),
        code: 'MARKETING_ADDON',
        name: 'Marketing',
        price: '1499',
        grantType: 'FEATURE',
        grantsFeature: 'MARKETING',
        grantsQuantity: '',
        stackable: true,
      },
      true,
    );
    expect(feature.ok && feature.request).toMatchObject({ grantsFeature: 'MARKETING' });
    expect(feature.ok && feature.request).not.toHaveProperty('grantsQuantity');
    expect(feature.ok && feature.request).not.toHaveProperty('stackable');
    expect(feature.ok && feature.request).not.toHaveProperty('billingType');
  });

  it('requires a feature, a positive price and a pack size', () => {
    const noFeature = toAddOnRequest(
      { ...emptyAddOnForm(), code: 'X_FEATURE', name: 'X', price: '0', grantType: 'FEATURE' },
      true,
    );
    expect(noFeature.ok ? [] : Object.keys(noFeature.errors).sort()).toEqual([
      'grantsFeature',
      'price',
    ]);

    const noPack = toAddOnRequest(
      { ...emptyAddOnForm(), code: 'SMS_PACK', name: 'SMS', price: '99', grantsQuantity: '1001' },
      true,
    );
    expect(noPack.ok ? [] : Object.keys(noPack.errors)).toEqual(['grantsQuantity']);
  });
});

describe('toGrantRequest', () => {
  it('sends the expiry as the end of the IST day, and needs a reason', () => {
    const result = toGrantRequest(
      ' shop-1 ',
      {
        ...emptyGrantForm(),
        addOnCode: 'EXTRA_SEAT',
        quantity: '2',
        expiresOn: '2027-03-31',
        reason: 'Goodwill',
      },
      addOn,
    );
    expect(result).toEqual({
      ok: true,
      request: {
        shopId: 'shop-1',
        addOnCode: 'EXTRA_SEAT',
        quantity: 2,
        expiresAt: '2027-03-31T18:29:59.000Z',
        reason: 'Goodwill',
      },
    });
    const noReason = toGrantRequest(
      'shop-1',
      { ...emptyGrantForm(), addOnCode: 'EXTRA_SEAT' },
      addOn,
    );
    expect(noReason.ok ? [] : Object.keys(noReason.errors)).toEqual(['reason']);
  });

  it('grants a feature once and never sends an expiry for OCR credits', () => {
    const feature = toGrantRequest(
      's',
      { ...emptyGrantForm(), quantity: '5', reason: 'r' },
      { code: 'MKT', grantType: 'FEATURE' },
    );
    expect(feature.ok && feature.request.quantity).toBe(1);
    const credits = toGrantRequest(
      's',
      { ...emptyGrantForm(), expiresOn: '2027-01-01', reason: 'r' },
      { code: 'OCR', grantType: 'OCR_CREDITS' },
    );
    expect(credits.ok && credits.request.expiresAt).toBeUndefined();
  });
});

describe('describeAddOnGrant', () => {
  it('names what the add-on gives', () => {
    const label = () => 'Marketing';
    expect(describeAddOnGrant(addOn, label, null)).toBe('1 extra user');
    expect(describeAddOnGrant({ grantType: 'SMS', grantsQuantity: 1000 }, label, null)).toBe(
      '1,000 SMS',
    );
    expect(
      describeAddOnGrant({ grantType: 'FEATURE', grantsQuantity: 1 }, label, 'MARKETING'),
    ).toBe('Marketing');
  });
});

describe('planGrantOptions', () => {
  it('offers only selectable plans that have a code', () => {
    const options = planGrantOptions([
      plan,
      { ...plan, id: 'p2', code: 'EXTRA_USER', planName: 'Extra User Plan', selectable: false },
      { ...plan, id: 'p3', code: null, planName: 'Legacy' },
      { ...plan, id: 'p4', code: 'PRO', planName: 'Pro', selectable: null },
    ]);
    expect(options).toEqual([
      { value: 'GROWTH', label: 'Growth' },
      { value: 'PRO', label: 'Pro' },
    ]);
  });
});

describe('toPlanGrantRequest', () => {
  it('sends the plan code, whole months and the trimmed reason', () => {
    const result = toPlanGrantRequest({ planCode: 'GROWTH', months: ' 6 ', reason: ' Support ' });
    expect(result).toEqual({
      ok: true,
      request: { planCode: 'GROWTH', durationMonths: 6, reason: 'Support' },
    });
  });

  it('needs a plan, 1 to 36 months and a reason of at most 200 characters', () => {
    const empty = toPlanGrantRequest({ ...emptyPlanGrantForm(), months: '' });
    expect(empty.ok).toBe(false);
    if (!empty.ok)
      expect(Object.keys(empty.errors).sort()).toEqual(['months', 'planCode', 'reason']);

    for (const months of ['0', '37', '1.5', 'x']) {
      const result = toPlanGrantRequest({ planCode: 'GROWTH', months, reason: 'ok' });
      expect(result.ok).toBe(false);
    }
    expect(toPlanGrantRequest({ planCode: 'GROWTH', months: '36', reason: 'ok' }).ok).toBe(true);

    const long = toPlanGrantRequest({ planCode: 'GROWTH', months: '1', reason: 'x'.repeat(201) });
    expect(long.ok).toBe(false);
    expect(
      toPlanGrantRequest({ planCode: 'GROWTH', months: '1', reason: 'x'.repeat(200) }).ok,
    ).toBe(true);
  });
});
