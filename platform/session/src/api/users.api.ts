import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { SetActiveShopResponse, ShopMembership } from '../model/auth.types.js';
import { SESSION_USER_ENDPOINTS } from './endpoints';

/** Shop membership APIs used by session auth flow. */
export const usersApi = {
  getMyShops: async (): Promise<ShopMembership[]> => {
    const response = await apiClient.get<ApiResponse<{ data: ShopMembership[] }>>(
      SESSION_USER_ENDPOINTS.ME_SHOPS,
    );
    return response.data.data;
  },

  setActiveShop: async (shopId: string): Promise<SetActiveShopResponse> => {
    const response = await apiClient.post<ApiResponse<SetActiveShopResponse>>(
      SESSION_USER_ENDPOINTS.ACTIVE_SHOP,
      { shopId },
    );
    return response.data;
  },
};
