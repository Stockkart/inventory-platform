import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse, ShopMenu } from '@inventory-platform/types';
import { SHOP_SELL_ENDPOINTS } from './endpoints';

export const shopMenuApi = {
  get: async (): Promise<ShopMenu> => {
    const response = await apiClient.get<ApiResponse<ShopMenu>>(
      SHOP_SELL_ENDPOINTS.ME_MENU
    );
    return response.data;
  },

  put: async (menu: ShopMenu): Promise<ShopMenu> => {
    const response = await apiClient.put<ApiResponse<ShopMenu>>(
      SHOP_SELL_ENDPOINTS.ME_MENU,
      {
        revision: menu.revision,
        sections: menu.sections,
      }
    );
    return response.data;
  },
};
