import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, ShopMenu } from '@inventory-platform/types';

export const shopMenuApi = {
  get: async (): Promise<ShopMenu> => {
    const response = await apiClient.get<ApiResponse<ShopMenu>>(
      API_ENDPOINTS.SHOPS.ME_MENU
    );
    return response.data;
  },

  put: async (menu: ShopMenu): Promise<ShopMenu> => {
    const response = await apiClient.put<ApiResponse<ShopMenu>>(
      API_ENDPOINTS.SHOPS.ME_MENU,
      {
        revision: menu.revision,
        sections: menu.sections,
      }
    );
    return response.data;
  },
};
