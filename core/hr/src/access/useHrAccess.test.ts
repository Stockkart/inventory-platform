// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import { useHrAccess } from './useHrAccess';

const SHOP_ID = 'shop-1';

function access(overrides: Partial<ShopAccess>): ShopAccess {
  return {
    role: 'CASHIER',
    relationship: 'STAFF',
    owner: false,
    canManageAccess: false,
    productSearch: {
      canView: true,
      canEdit: false,
      editMode: 'FULL_EDIT',
      canEditAll: false,
      editableFields: [],
    },
    stockCorrection: { canCreate: false, canApprove: false },
    modules: {
      accounting: false,
      analytics: false,
      mis: false,
      taxes: false,
      stockCorrection: false,
      marketing: false,
      paymentPlan: false,
      productSearchEdit: false,
      hr: true,
    },
    team: {
      manageInvitations: false,
      manageJoinRequests: false,
      manageShopUsers: false,
      viewMyInvitations: true,
    },
    hr: null,
    ...overrides,
  };
}

function signInWith(shopAccess: ShopAccess | undefined) {
  // Only `user.shopId` is read by the hook; the rest of the auth user is irrelevant here.
  useAuthStore.setState({ user: { shopId: SHOP_ID } } as never);
  useShopAccessStore.setState({ byShopId: shopAccess ? { [SHOP_ID]: shopAccess } : {} });
}

afterEach(() => {
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('useHrAccess', () => {
  it('grants only the listed permissions and exposes the linked employee', () => {
    signInWith(access({ hr: { permissions: ['VIEW_ATTENDANCE'], employeeId: 'emp-7' } }));
    const { result } = renderHook(() => useHrAccess());
    expect(result.current.can('VIEW_ATTENDANCE')).toBe(true);
    expect(result.current.can('RUN_PAYROLL')).toBe(false);
    expect(result.current.employeeId).toBe('emp-7');
    expect(result.current.isOwner).toBe(false);
  });

  it('denies everything when HR access is null or access is not loaded', () => {
    signInWith(access({ hr: null }));
    expect(renderHook(() => useHrAccess()).result.current.can('VIEW_EMPLOYEES')).toBe(false);

    signInWith(undefined);
    const { result } = renderHook(() => useHrAccess());
    expect(result.current.can('VIEW_EMPLOYEES')).toBe(false);
    expect(result.current.employeeId).toBeNull();
  });

  it('reports the owner flag from shop access', () => {
    signInWith(access({ owner: true, hr: { permissions: [], employeeId: null } }));
    expect(renderHook(() => useHrAccess()).result.current.isOwner).toBe(true);
  });
});
