import { describe, expect, it } from 'vitest';
import { isPlanFeatureEnabled } from './plan-entitlements';

const enforcing = { enforcement: 'ENFORCE' as const, features: ['CREDIT_BALANCE'] };

describe('isPlanFeatureEnabled', () => {
  it('allows everything until entitlements load', () => {
    expect(isPlanFeatureEnabled(null, 'ACCOUNTING')).toBe(true);
  });

  it('allows everything unless the backend enforces', () => {
    expect(isPlanFeatureEnabled({ enforcement: 'LOG_ONLY', features: [] }, 'ACCOUNTING')).toBe(
      true,
    );
    expect(isPlanFeatureEnabled({ enforcement: 'OFF', features: [] }, 'ACCOUNTING')).toBe(true);
  });

  it('checks the feature list when enforcing', () => {
    expect(isPlanFeatureEnabled(enforcing, 'CREDIT_BALANCE')).toBe(true);
    expect(isPlanFeatureEnabled(enforcing, 'ACCOUNTING')).toBe(false);
  });
});
