import { describe, expect, it } from 'vitest';
import type { PlanResponse } from '@inventory-platform/plan/types';
import { buildPlanFeatures } from './PlanGrid';

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

describe('buildPlanFeatures', () => {
  it('tags SMS and WhatsApp allowances and MARKETING coming soon', () => {
    const lines = buildPlanFeatures(
      plan({ smsLimit: 250, whatsappLimit: 250, userLimit: 2, features: ['MARKETING'] }),
    );
    expect(lines).toEqual([
      { label: '250 SMS/month', comingSoon: true },
      { label: '250 WhatsApp/month', comingSoon: true },
      { label: '2 users' },
      { label: 'SMS / WhatsApp marketing', comingSoon: true },
    ]);
  });

  it('does not tag a plan with no SMS or WhatsApp', () => {
    expect(buildPlanFeatures(plan({ smsLimit: 0, whatsappLimit: 0 }))).toEqual([
      { label: 'No SMS' },
      { label: 'No WhatsApp' },
    ]);
  });

  it('tags the unlimited SMS and WhatsApp lines', () => {
    expect(buildPlanFeatures(plan({ unlimited: true }))).toEqual([
      { label: 'Unlimited billing' },
      { label: 'Unlimited SMS', comingSoon: true },
      { label: 'Unlimited WhatsApp', comingSoon: true },
    ]);
  });
});
