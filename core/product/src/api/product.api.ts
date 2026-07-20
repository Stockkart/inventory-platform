import { apiClient } from '@inventory-platform/api-client';
import { PRODUCT_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { ProductSuggestion, InventoryItem } from '@inventory-platform/product/types';

export const productApi = {
  /** Typeahead for registration: existing catalog products for the current shop. */
  suggest: async (query: string): Promise<ProductSuggestion[]> => {
    const q = query.trim();
    if (!q) return [];
    const response = await apiClient.get<ApiResponse<ProductSuggestion[]>>(
      PRODUCT_ENDPOINTS.SUGGEST,
      { q },
    );
    return response.data ?? [];
  },

  /** Full catalog identity for a selected product (prefill source). */
  getById: async (id: string): Promise<ProductSuggestion> => {
    const response = await apiClient.get<ApiResponse<ProductSuggestion>>(
      PRODUCT_ENDPOINTS.BY_ID(id.trim()),
    );
    return response.data;
  },

  /** Latest inventory lot for a catalog product (registration prefill). Null when none exists. */
  getLastInventory: async (productId: string): Promise<InventoryItem | null> => {
    const response = await apiClient.get<ApiResponse<InventoryItem | null>>(
      PRODUCT_ENDPOINTS.LAST_INVENTORY(productId.trim()),
    );
    return response.data ?? null;
  },
};
