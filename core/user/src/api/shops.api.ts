import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { RegisterShopDto, RegisterShopResponse, RequestJoinShopDto, RequestJoinShopResponse, JoinRequest, JoinRequestsResponse, OwnerShopSummary, ProcessJoinRequestDto, ProcessJoinRequestResponse, ShopDetailResponse, UpdateShopDto } from '@inventory-platform/user/types';
import { SHOP_ENDPOINTS } from './endpoints';

export const shopsApi = {
  register: async (data: RegisterShopDto): Promise<RegisterShopResponse> => {
    const response = await apiClient.post<{ success: boolean; data: RegisterShopResponse }>(
      SHOP_ENDPOINTS.REGISTER,
      data
    );
    return response.data;
  },

  getShopsByOwnerEmail: async (email: string): Promise<OwnerShopSummary[]> => {
    const response = await apiClient.get<ApiResponse<{ data: OwnerShopSummary[] }>>(
      SHOP_ENDPOINTS.BY_OWNER_EMAIL,
      { email }
    );
    return response.data.data;
  },

  requestToJoin: async (data: RequestJoinShopDto): Promise<RequestJoinShopResponse> => {
    const response = await apiClient.post<ApiResponse<RequestJoinShopResponse>>(
      SHOP_ENDPOINTS.JOIN_REQUEST,
      data
    );
    return response.data;
  },

  getJoinRequests: async (shopId?: string): Promise<JoinRequest[]> => {
    const params = shopId ? { shopId } : undefined;
    const response = await apiClient.get<ApiResponse<JoinRequestsResponse>>(
      SHOP_ENDPOINTS.JOIN_REQUESTS,
      params as Record<string, string>
    );
    return response.data.data;
  },

  processJoinRequest: async (
    requestId: string,
    data: ProcessJoinRequestDto
  ): Promise<ProcessJoinRequestResponse> => {
    const response = await apiClient.post<ApiResponse<ProcessJoinRequestResponse>>(
      SHOP_ENDPOINTS.PROCESS_JOIN_REQUEST(requestId),
      data
    );
    return response.data;
  },

  getActiveShop: async (): Promise<ShopDetailResponse> => {
    const response = await apiClient.get<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.ACTIVE_SHOP
    );
    return response.data;
  },

  getShop: async (shopId: string): Promise<ShopDetailResponse> => {
    const response = await apiClient.get<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.BY_ID(shopId)
    );
    return response.data;
  },

  updateActiveShop: async (data: UpdateShopDto): Promise<ShopDetailResponse> => {
    const response = await apiClient.patch<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.ACTIVE_SHOP,
      data
    );
    return response.data;
  },

  updateShop: async (
    shopId: string,
    data: UpdateShopDto
  ): Promise<ShopDetailResponse> => {
    const response = await apiClient.patch<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.BY_ID(shopId),
      data
    );
    return response.data;
  },
};
