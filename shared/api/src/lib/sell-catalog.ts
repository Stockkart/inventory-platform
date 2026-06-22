import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, SellCatalog } from '@inventory-platform/types';

export const sellCatalogApi = {
  /** Full sell catalog (menu + direct stock). Optional {@code q} filters on the server. */
  get: async (q?: string): Promise<SellCatalog> => {
    const params: Record<string, string> = {};
    if (q?.trim()) {
      params.q = q.trim();
    }
    const response = await apiClient.get<ApiResponse<SellCatalog>>(
      API_ENDPOINTS.SHOPS.ME_SELL_CATALOG,
      params
    );
    const data = response.data;
    return {
      menu: { ...data.menu, sections: data.menu?.sections ?? [] },
      directStock: data.directStock ?? [],
    };
  },
};
