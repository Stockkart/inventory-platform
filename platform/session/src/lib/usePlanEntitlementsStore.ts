import { create } from 'zustand';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse, ShopEntitlementsResponse } from '@inventory-platform/contracts';

interface PlanEntitlementsState {
  byShopId: Record<string, ShopEntitlementsResponse>;
  loading: boolean;
  error: string | null;
  fetchEntitlements: (options?: { force?: boolean }) => Promise<ShopEntitlementsResponse | null>;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

export const usePlanEntitlementsStore = create<PlanEntitlementsState>((set, get) => ({
  byShopId: {},
  loading: false,
  error: null,

  fetchEntitlements: async (options) => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    if (!options?.force && get().byShopId[shopId]) {
      return get().byShopId[shopId] ?? null;
    }
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<ApiResponse<ShopEntitlementsResponse>>(
        '/plans/shop/entitlements',
      );
      const entitlements = response.data;
      set((state) => ({
        byShopId: { ...state.byShopId, [shopId]: entitlements },
        loading: false,
      }));
      return entitlements;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan entitlements';
      set({ loading: false, error: message });
      return null;
    }
  },

  clear: () => set({ byShopId: {}, loading: false, error: null }),
}));
