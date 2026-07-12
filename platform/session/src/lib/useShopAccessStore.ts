import { create } from 'zustand';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { ShopAccess } from '@inventory-platform/access';

interface ShopAccessState {
  byShopId: Record<string, ShopAccess>;
  loading: boolean;
  error: string | null;
  fetchAccess: (opts?: { force?: boolean }) => Promise<ShopAccess | null>;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

export const useShopAccessStore = create<ShopAccessState>((set, get) => ({
  byShopId: {},
  loading: false,
  error: null,

  fetchAccess: async (opts) => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    if (!opts?.force && get().byShopId[shopId]) {
      return get().byShopId[shopId];
    }
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<ApiResponse<ShopAccess>>('/shops/me/access');
      const access = response.data;
      set((state) => ({
        byShopId: { ...state.byShopId, [shopId]: access },
        loading: false,
      }));
      return access;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shop access';
      set({ loading: false, error: message });
      return null;
    }
  },

  clear: () => set({ byShopId: {}, loading: false, error: null }),
}));
