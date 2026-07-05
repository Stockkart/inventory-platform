import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { SellCatalog } from '@inventory-platform/plugin-cafe/types';
import { SHOP_SELL_ENDPOINTS } from './endpoints';

export const sellCatalogApi = {
  get: async (q?: string): Promise<SellCatalog> => {
    const params: Record<string, string> = {};
    if (q?.trim()) {
      params.q = q.trim();
    }
    const response = await apiClient.get<ApiResponse<SellCatalog>>(
      SHOP_SELL_ENDPOINTS.ME_SELL_CATALOG,
      params
    );
    const data = response.data;
    return {
      menu: { ...data.menu, sections: data.menu?.sections ?? [] },
      directStock: data.directStock ?? [],
    };
  },
};
