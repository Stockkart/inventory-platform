import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  ShopAccess,
  ShopRbacAdmin,
  UpdateMemberPermissionsRequest,
  UpdateShopRbacPolicyRequest,
  ShopMemberAccess,
} from '@inventory-platform/types';

export const shopAccessApi = {
  getMyAccess: async (): Promise<ShopAccess> => {
    const response = await apiClient.get<ApiResponse<ShopAccess>>(
      API_ENDPOINTS.SHOPS.ME_ACCESS
    );
    return response.data;
  },

  getAdmin: async (shopId: string): Promise<ShopRbacAdmin> => {
    const response = await apiClient.get<ApiResponse<ShopRbacAdmin>>(
      API_ENDPOINTS.SHOPS.RBAC(shopId)
    );
    return response.data;
  },

  updatePolicy: async (
    shopId: string,
    body: UpdateShopRbacPolicyRequest
  ): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.SHOPS.RBAC_POLICY(shopId), body);
  },

  updateMember: async (
    shopId: string,
    userId: string,
    body: UpdateMemberPermissionsRequest
  ): Promise<ShopMemberAccess> => {
    const response = await apiClient.patch<ApiResponse<ShopMemberAccess>>(
      API_ENDPOINTS.SHOPS.RBAC_MEMBER(shopId, userId),
      body
    );
    return response.data;
  },
};
