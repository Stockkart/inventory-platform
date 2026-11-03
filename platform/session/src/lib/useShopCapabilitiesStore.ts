import { create } from 'zustand';
import { shopCapabilitiesApi } from '../api/capabilities.api';
import { apiClient } from '@inventory-platform/api-client';
import type { ShopUiCapabilities } from '@inventory-platform/access';

interface ShopCapabilitiesState {
  byShopId: Record<string, ShopUiCapabilities>;
  loading: boolean;
  error: string | null;
  /**
   * Loads the active shop's capabilities once. `force` reloads them for the active shop only and
   * keeps the cached value (and `loading` false) until the new one arrives.
   */
  fetchCapabilities: (opts?: { force?: boolean }) => Promise<ShopUiCapabilities | null>;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

export const useShopCapabilitiesStore = create<ShopCapabilitiesState>((set, get) => ({
  byShopId: {},
  loading: false,
  error: null,

  fetchCapabilities: async (opts) => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    const cached = get().byShopId[shopId];
    if (cached?.sellSurface && !opts?.force) {
      return cached;
    }
    set(opts?.force && cached ? { error: null } : { loading: true, error: null });
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
