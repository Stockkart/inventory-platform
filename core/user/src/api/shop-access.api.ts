import { apiClient } from '@inventory-platform/api-client';
import type {
  ApiResponse,
  ShopAccess,
  ShopMemberAccess,
  ShopRbacAdmin,
  UpdateMemberPermissionsRequest,
  UpdateShopRbacPolicyRequest,
} from '@inventory-platform/types';
import { SHOP_ACCESS_ENDPOINTS } from './endpoints';

export const shopAccessApi = {
  getMyAccess: async (): Promise<ShopAccess> => {
    const response = await apiClient.get<ApiResponse<ShopAccess>>(
      SHOP_ACCESS_ENDPOINTS.ME_ACCESS
    );
    return response.data;
  },

  getAdmin: async (shopId: string): Promise<ShopRbacAdmin> => {
    const response = await apiClient.get<ApiResponse<ShopRbacAdmin>>(
      SHOP_ACCESS_ENDPOINTS.RBAC(shopId)
    );
    return response.data;
  },

  updatePolicy: async (
    shopId: string,
    body: UpdateShopRbacPolicyRequest
  ): Promise<void> => {
    await apiClient.patch(SHOP_ACCESS_ENDPOINTS.RBAC_POLICY(shopId), body);
  },

  updateMember: async (
    shopId: string,
    userId: string,
    body: UpdateMemberPermissionsRequest
  ): Promise<ShopMemberAccess> => {
    const response = await apiClient.patch<ApiResponse<ShopMemberAccess>>(
      SHOP_ACCESS_ENDPOINTS.RBAC_MEMBER(shopId, userId),
      body
    );
    return response.data;
  },
};
