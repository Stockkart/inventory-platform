import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  LinkableUser,
  ShopMembership,
  SetActiveShopResponse,
} from '@inventory-platform/types';

export const usersApi = {
  /**
   * Search for a user by email to link to vendor/customer.
   * Returns minimal info for identity confirmation.
   */
  searchByEmail: async (email: string): Promise<LinkableUser | null> => {
    const response = await apiClient.get<ApiResponse<LinkableUser | null>>(
      API_ENDPOINTS.USERS.SEARCH,
      { email }
    );
    return response?.data ?? null;
  },

  getMyShops: async (): Promise<ShopMembership[]> => {
    const response = await apiClient.get<ApiResponse<{ data: ShopMembership[] }>>(
      API_ENDPOINTS.USERS.ME_SHOPS
    );
    // API returns: { success: true, data: { data: [...] } }
    return response.data.data;
  },

  setActiveShop: async (shopId: string): Promise<SetActiveShopResponse> => {
    const response = await apiClient.post<ApiResponse<SetActiveShopResponse>>(
      API_ENDPOINTS.USERS.ACTIVE_SHOP,
      { shopId }
    );
    return response.data;
  },
};
