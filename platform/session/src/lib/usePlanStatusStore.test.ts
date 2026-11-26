import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@inventory-platform/api-client';
import type { ShopPlanStatusResponse } from '@inventory-platform/contracts';
import { isShopPlanExpired, usePlanStatusStore } from './usePlanStatusStore';

const SHOP = 'shop-1';

function status(planExpired: boolean): ShopPlanStatusResponse {
  return { shopId: SHOP, planExpired } as ShopPlanStatusResponse;
}

describe('usePlanStatusStore plan expiry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlanStatusStore.getState().clear();
  });

  it('records a plan-expired answer for the active shop before any plan status loads', () => {
    vi.spyOn(apiClient, 'getShopId').mockReturnValue(SHOP);
    usePlanStatusStore.getState().markPlanExpired();
    const state = usePlanStatusStore.getState();
    expect(isShopPlanExpired(state, SHOP)).toBe(true);
    expect(isShopPlanExpired(state, 'other-shop')).toBe(false);
    expect(isShopPlanExpired(state, null)).toBe(false);
  });

  it('ignores a plan-expired answer when no shop is active', () => {
    vi.spyOn(apiClient, 'getShopId').mockReturnValue(null);
    usePlanStatusStore.getState().markPlanExpired();
    expect(usePlanStatusStore.getState().expiredByShopId).toEqual({});
  });

  it('takes the latest plan status, so a renewed plan clears the expiry', async () => {
    vi.spyOn(apiClient, 'getShopId').mockReturnValue(SHOP);
    usePlanStatusStore.getState().markPlanExpired();
    vi.spyOn(apiClient, 'get').mockResolvedValue({ success: true, data: status(false) });
    await usePlanStatusStore.getState().fetchPlanStatus({ force: true });
    expect(isShopPlanExpired(usePlanStatusStore.getState(), SHOP)).toBe(false);
  });

  it('marks the shop expired when the plan status says so', async () => {
    vi.spyOn(apiClient, 'getShopId').mockReturnValue(SHOP);
    vi.spyOn(apiClient, 'get').mockResolvedValue({ success: true, data: status(true) });
    await usePlanStatusStore.getState().fetchPlanStatus({ force: true });
    expect(isShopPlanExpired(usePlanStatusStore.getState(), SHOP)).toBe(true);
  });

  it('forgets every shop on clear (sign-out, shop switch)', () => {
    vi.spyOn(apiClient, 'getShopId').mockReturnValue(SHOP);
    usePlanStatusStore.getState().markPlanExpired();
    usePlanStatusStore.getState().clear();
    expect(isShopPlanExpired(usePlanStatusStore.getState(), SHOP)).toBe(false);
  });
});
