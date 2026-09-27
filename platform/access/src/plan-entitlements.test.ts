import { describe, expect, it } from 'vitest';
import { isPathEntitled, isPlanFeatureEnabled, planFeatureForPath } from './plan-entitlements';

const enforcing = { enforcement: 'ENFORCE' as const, features: ['CREDIT_BALANCE'] };

describe('planFeatureForPath', () => {
  it('maps a gated path and its children', () => {
    expect(planFeatureForPath('/dashboard/accounting')).toBe('ACCOUNTING');
    expect(planFeatureForPath('/dashboard/accounting/ledger')).toBe('ACCOUNTING');
    expect(planFeatureForPath('/dashboard/barcodes')).toBe('BARCODE_GENERATOR');
  });

  it('does not match a path that only shares a prefix', () => {
    expect(planFeatureForPath('/dashboard/credit-notes')).toBeNull();
    expect(planFeatureForPath('/dashboard/overview')).toBeNull();
  });
});

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

describe('isPathEntitled', () => {
  it('always allows ungated paths', () => {
    expect(isPathEntitled('/dashboard/overview', enforcing)).toBe(true);
  });

  it('blocks gated paths the plan lacks when enforcing', () => {
    expect(isPathEntitled('/dashboard/accounting/journal', enforcing)).toBe(false);
    expect(isPathEntitled('/dashboard/credit', enforcing)).toBe(true);
  });
});
