import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, ShopUiCapabilities } from '@inventory-platform/types';

export const shopCapabilitiesApi = {
  get: async (): Promise<ShopUiCapabilities> => {
    const response = await apiClient.get<ApiResponse<ShopUiCapabilities>>(
      API_ENDPOINTS.SHOPS.ME_CAPABILITIES
    );
    return response.data;
  },
};
