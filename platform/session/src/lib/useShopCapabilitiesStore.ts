import { create } from 'zustand';
import { shopCapabilitiesApi } from '../api/capabilities.api';
import { apiClient } from '@inventory-platform/api-client';
import type { ShopUiCapabilities } from '@inventory-platform/access';

interface ShopCapabilitiesState {
  byShopId: Record<string, ShopUiCapabilities>;
  loading: boolean;
  error: string | null;
  fetchCapabilities: () => Promise<ShopUiCapabilities | null>;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

export const useShopCapabilitiesStore = create<ShopCapabilitiesState>((set, get) => ({
  byShopId: {},
  loading: false,
  error: null,

  fetchCapabilities: async () => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    const cached = get().byShopId[shopId];
    if (cached?.sellSurface) {
      return cached;
    }
    set({ loading: true, error: null });
    try {
      const capabilities = await shopCapabilitiesApi.get();
      set((state) => ({
        byShopId: { ...state.byShopId, [shopId]: capabilities },
        loading: false,
      }));
      return capabilities;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shop capabilities';
      set({ loading: false, error: message });
      return null;
    }
  },

  clear: () => set({ byShopId: {}, loading: false, error: null }),
}));
