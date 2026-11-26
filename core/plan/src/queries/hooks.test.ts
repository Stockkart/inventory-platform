// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanFeature, ShopEntitlementsResponse } from '@inventory-platform/contracts';
import { planKeys } from './keys';
import { useShopEntitlementsQuery } from './hooks';

const auth = vi.hoisted(() => ({ shopId: 'shop-1' as string | null }));
vi.mock('@inventory-platform/session', () => ({
  useAuthStore: <T>(select: (s: { user: { shopId: string | null } | null }) => T) =>
    select({ user: auth.shopId ? { shopId: auth.shopId } : null }),
}));
const api = vi.hoisted(() => ({ getShopEntitlements: vi.fn() }));
vi.mock('../api/plans.api', () => ({ plansApi: api }));

function entitlements(features: PlanFeature[]): ShopEntitlementsResponse {
  return {
    planId: 'plan-1',
    planCode: 'BASIC',
    source: 'PLAN',
    features,
    enforcement: 'ENFORCE',
    userLimit: 2,
    userCount: 1,
    ocrLimit: null,
    ocrUsed: 0,
    expiresAt: null,
  };
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.shopId = 'shop-1';
});

describe('useShopEntitlementsQuery', () => {
  it('cachesUnderTheSignedInShopsKey', async () => {
    api.getShopEntitlements.mockResolvedValue(entitlements(['ACCOUNTING']));
    const { queryClient, wrapper } = setup();

    const { result } = renderHook(() => useShopEntitlementsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.features).toEqual(['ACCOUNTING']);
    expect(queryClient.getQueryData(planKeys.shopEntitlements('shop-1'))).toEqual(
      result.current.data,
    );
  });

  it('doesNotFetchWithoutASelectedShop', () => {
    auth.shopId = null;
    const { wrapper } = setup();

    const { result } = renderHook(() => useShopEntitlementsQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(api.getShopEntitlements).not.toHaveBeenCalled();
  });

  it('neverServesAnotherShopsCachedEntitlements', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(planKeys.shopEntitlements('shop-1'), entitlements(['ACCOUNTING']));
    auth.shopId = 'shop-2';
    api.getShopEntitlements.mockResolvedValue(entitlements([]));

    const { result } = renderHook(() => useShopEntitlementsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.features).toEqual([]);
    expect(api.getShopEntitlements).toHaveBeenCalledTimes(1);
  });

  it('refetchesWhenPaymentInvalidatesThePlanKeys', async () => {
    api.getShopEntitlements
      .mockResolvedValueOnce(entitlements([]))
      .mockResolvedValueOnce(entitlements(['ACCOUNTING']));
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useShopEntitlementsQuery(), { wrapper });
    await waitFor(() => expect(result.current.data?.features).toEqual([]));

    // useVerifyPlanPaymentMutation invalidates planKeys.all; the entitlements key sits under it.
    await act(() => queryClient.invalidateQueries({ queryKey: planKeys.all }));

    await waitFor(() => expect(result.current.data?.features).toEqual(['ACCOUNTING']));
    expect(api.getShopEntitlements).toHaveBeenCalledTimes(2);
  });
});
