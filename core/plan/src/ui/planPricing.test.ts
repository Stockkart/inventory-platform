import { describe, expect, it } from 'vitest';
import type { PlanResponse } from '@inventory-platform/plan/types';
import { buildPlanComparison, planListPriceLabel, plansForSelection } from './planPricing';

function plan(overrides: Partial<PlanResponse>): PlanResponse {
  return {
    id: 'p',
    planName: 'Plan',
    price: 0,
    arcPrice: 9999,
    billingLimit: null,
    billCountLimit: null,
    smsLimit: null,
    whatsappLimit: null,
    userLimit: null,
    unlimited: false,
    linkedId: null,
    bestFor: null,
    ...overrides,
  };
}

describe('planListPriceLabel', () => {
  it('shows the anchor when it is above the real price', () => {
    expect(planListPriceLabel(plan({ listPrice: 12999 }))).toBe('₹12,999');
  });

  it('hides a missing, equal or lower anchor', () => {
    expect(planListPriceLabel(plan({}))).toBeNull();
    expect(planListPriceLabel(plan({ listPrice: null }))).toBeNull();
    expect(planListPriceLabel(plan({ listPrice: 9999 }))).toBeNull();
    expect(planListPriceLabel(plan({ listPrice: 5000 }))).toBeNull();
  });
});

describe('buildPlanComparison', () => {
  const starter = plan({
    id: 's',
    code: 'STARTER',
    displayOrder: 1,
    arcPrice: 4999,
    userLimit: 2,
    smsLimit: 0,
    features: ['CREDIT_BALANCE'],
  });
  const pro = plan({
    id: 'p',
    code: 'PROFESSIONAL',
    displayOrder: 2,
    userLimit: 5,
    smsLimit: 500,
    features: ['CREDIT_BALANCE', 'ACCOUNTING'],
  });
  const legacy = plan({ id: 'l', planName: 'Extra User Plan', arcPrice: 499 });

  it('keeps catalogue plans only, in display order', () => {
    const result = buildPlanComparison([pro, legacy, starter]);
    expect(result.plans.map((p) => p.id)).toEqual(['s', 'p']);
  });

  it('treats a null limit as unlimited and zero as not included', () => {
    const rows = buildPlanComparison([starter, pro]).rows;
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.values]));
    expect(byKey.price).toEqual(['₹4,999', '₹9,999']);
    expect(byKey.users).toEqual(['2', '5']);
    expect(byKey.sms).toEqual(['—', '500']);
    expect(byKey.whatsapp).toEqual(['Unlimited', 'Unlimited']);
  });

  it('adds a row only for features some shown plan includes', () => {
    const rows = buildPlanComparison([starter, pro]).rows;
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.values]));
    expect(byKey.CREDIT_BALANCE).toEqual([true, true]);
    expect(byKey.ACCOUNTING).toEqual([false, true]);
    expect(byKey.SALARY).toBeUndefined();
  });

  it('lists the every-plan rows as included for all plans, then brochure sections', () => {
    const rows = buildPlanComparison([starter, pro]).rows;
    const scanSell = rows.find((row) => row.key === 'core-scan-sell');
    expect(scanSell).toMatchObject({ group: 'Billing & stock', values: [true, true] });
    expect([...new Set(rows.map((row) => row.group))]).toEqual([
      'Plan limits',
      'Billing & stock',
      'Money & accounts',
    ]);
  });

  it('shows the backend caps for attendance and roles', () => {
    const basic = plan({ id: 'b', code: 'STARTER', roleLimit: 2, features: [] });
    const top = plan({
      id: 't',
      code: 'ENTERPRISE',
      attendanceUserLimit: 4,
      features: ['BIOMETRIC_ATTENDANCE', 'ADVANCED_ACCESS_CONTROL'],
    });
    const byKey = Object.fromEntries(
      buildPlanComparison([basic, top]).rows.map((row) => [row.key, row]),
    );
    expect(byKey.BIOMETRIC_ATTENDANCE.values).toEqual([false, 'Up to 4 users']);
    expect(byKey.ADVANCED_ACCESS_CONTROL).toMatchObject({
      label: 'Access control (roles & permissions)',
      values: ['Limited (2 roles)', 'Advanced'],
    });
  });

  it('tags features that are sold but not live yet', () => {
    const marketing = plan({ id: 'e', code: 'ENTERPRISE', features: ['MARKETING'] });
    const row = buildPlanComparison([starter, marketing]).rows.find((r) => r.key === 'MARKETING');
    expect(row).toMatchObject({ group: 'Grow your business', comingSoon: true });
  });
});

describe('plansForSelection', () => {
  it('leaves the legacy add-on plans out of plan selection; they are sold at payment', () => {
    const starter = plan({ id: 's', planName: 'Starter' });
    const extraUser = plan({ id: 'u', planName: 'Extra User Plan' });
    const extraShop = plan({ id: 'x', planName: 'Extra Shop Plan' });
    const pro = plan({ id: 'p', planName: 'Professional' });

    expect(plansForSelection([starter, extraUser, pro, extraShop])).toEqual([starter, pro]);
  });
});
