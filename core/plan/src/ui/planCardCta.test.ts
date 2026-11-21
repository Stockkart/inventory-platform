import { describe, expect, it } from 'vitest';
import type { PlanOptionResponse } from '@inventory-platform/plan/types';
import { planCardCta } from './planCardCta';

function option(overrides: Partial<PlanOptionResponse>): PlanOptionResponse {
  return {
    planId: 'p',
    planCode: 'STARTER',
    action: 'BUY',
    actionAvailable: true,
    unavailableReason: null,
    availableFrom: null,
    ...overrides,
  };
}

describe('planCardCta', () => {
  it('labels each action from the API, never comparing plans', () => {
    expect(planCardCta(option({ action: 'BUY' }), 'Upgrade', false).label).toBe('Buy');
    expect(planCardCta(option({ action: 'UPGRADE' }), 'Upgrade', false).label).toBe('Upgrade');
    expect(planCardCta(option({ action: 'CURRENT' }), 'Upgrade', true)).toEqual({
      label: 'Renew plan',
      disabled: false,
      note: null,
    });
  });

  it('disables an action the API says must wait, with its reason and date', () => {
    const cta = planCardCta(
      option({
        action: 'BUY',
        actionAvailable: false,
        unavailableReason:
          'Your current plan is still active; you can renew it, or change plans after it ends',
        availableFrom: '2027-11-20T18:30:00Z',
      }),
      'Upgrade',
      false,
    );
    expect(cta.label).toBe('Buy');
    expect(cta.disabled).toBe(true);
    expect(cta.note).toBe(
      'Your current plan is still active; you can renew it, or change plans after it ends. Available from 21 Nov 2027.',
    );
  });

  it('falls back to the caller label without an API option', () => {
    expect(planCardCta(undefined, 'Select plan', false)).toEqual({
      label: 'Select plan',
      disabled: false,
      note: null,
    });
    expect(planCardCta(undefined, 'Select plan', true)).toEqual({
      label: 'Current plan',
      disabled: true,
      note: null,
    });
  });
});
