import { create } from 'zustand';
import { apiClient, plansApi } from '@inventory-platform/api';
import type { ShopPlanStatusResponse } from '@inventory-platform/types';

interface PlanStatusState {
  byShopId: Record<string, ShopPlanStatusResponse>;
  loading: boolean;
  error: string | null;
  fetchPlanStatus: (options?: { force?: boolean }) => Promise<ShopPlanStatusResponse | null>;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

export const usePlanStatusStore = create<PlanStatusState>((set, get) => ({
  byShopId: {},
  loading: false,
  error: null,

  fetchPlanStatus: async (options) => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    if (!options?.force && get().byShopId[shopId]) {
      return get().byShopId[shopId] ?? null;
    }
    set({ loading: true, error: null });
    try {
      const status = await plansApi.getShopStatus();
      set((state) => ({
        byShopId: { ...state.byShopId, [shopId]: status },
        loading: false,
      }));
      return status;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load plan status';
      set({ loading: false, error: message });
      return null;
    }
  },

  clear: () => set({ byShopId: {}, loading: false, error: null }),
}));
