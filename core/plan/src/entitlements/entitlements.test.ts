import { describe, expect, it } from 'vitest';
import { ApiError } from '@inventory-platform/api-client';
import type { ShopEntitlementsResponse } from '@inventory-platform/plan/types';
import {
  isAtLimit,
  isPlanFeature,
  readEntitlementError,
  splitFeatures,
  usageOfLimit,
} from './entitlements';

describe('readEntitlementError', () => {
  it('reads a coded plan-limit 402', () => {
    const error = new ApiError('Upgrade to unlock', {
      status: 402,
      code: 'FEATURE_NOT_IN_PLAN',
      details: { feature: 'ACCOUNTING', requiredPlanCode: 'PROFESSIONAL' },
    });
    expect(readEntitlementError(error)).toEqual({
      code: 'FEATURE_NOT_IN_PLAN',
      message: 'Upgrade to unlock',
      details: { feature: 'ACCOUNTING', requiredPlanCode: 'PROFESSIONAL' },
    });
  });

  it('ignores plan expiry, other statuses and plain errors', () => {
    expect(readEntitlementError(new ApiError('expired', { status: 402 }))).toBeNull();
    expect(
      readEntitlementError(new ApiError('bad', { status: 400, code: 'FEATURE_NOT_IN_PLAN' })),
    ).toBeNull();
    expect(readEntitlementError(new Error('boom'))).toBeNull();
  });
});

describe('usage helpers', () => {
  it('formats usage against a limit', () => {
    expect(usageOfLimit(3, 5)).toBe('3 of 5');
    expect(usageOfLimit(1200, null)).toBe('1,200');
  });

  it('flags only a reached limit', () => {
    expect(isAtLimit(5, 5)).toBe(true);
    expect(isAtLimit(4, 5)).toBe(false);
    expect(isAtLimit(99, null)).toBe(false);
  });
});

describe('features', () => {
  it('recognises plan features', () => {
    expect(isPlanFeature('ACCOUNTING')).toBe(true);
    expect(isPlanFeature('NOPE')).toBe(false);
    expect(isPlanFeature(null)).toBe(false);
  });

  it('splits included and locked features', () => {
    const entitlements = {
      features: ['ACCOUNTING', 'CREDIT_BALANCE'],
    } as ShopEntitlementsResponse;
    const { included, locked } = splitFeatures(entitlements);
    expect(included).toEqual(['CREDIT_BALANCE', 'ACCOUNTING']);
    expect(locked).toContain('SALARY');
    expect(locked).not.toContain('ACCOUNTING');
  });
});
