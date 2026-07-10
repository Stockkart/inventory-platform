import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { ShopUiCapabilities } from '@inventory-platform/access';
import { SESSION_SHOP_ENDPOINTS } from './endpoints';

export const shopCapabilitiesApi = {
  get: async (): Promise<ShopUiCapabilities> => {
    const response = await apiClient.get<ApiResponse<ShopUiCapabilities>>(
      SESSION_SHOP_ENDPOINTS.ME_CAPABILITIES,
    );
    return response.data;
  },
};
