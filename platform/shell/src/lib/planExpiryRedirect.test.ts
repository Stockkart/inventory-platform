import { describe, expect, it } from 'vitest';
import { mustLeaveForPlanStatus } from './planExpiryRedirect';

describe('mustLeaveForPlanStatus', () => {
  it('sends an expired shop from any other dashboard screen to My Plan', () => {
    expect(mustLeaveForPlanStatus('/dashboard', true)).toBe(true);
    expect(mustLeaveForPlanStatus('/dashboard/scan-sell', true)).toBe(true);
  });

  it('keeps the renewal screens open for an expired shop', () => {
    expect(mustLeaveForPlanStatus('/dashboard/plan-status', true)).toBe(false);
    expect(mustLeaveForPlanStatus('/dashboard/plan-payment', true)).toBe(false);
    expect(mustLeaveForPlanStatus('/dashboard/shops', true)).toBe(false);
  });

  it('never redirects a shop whose plan is active', () => {
    expect(mustLeaveForPlanStatus('/dashboard', false)).toBe(false);
  });
});
