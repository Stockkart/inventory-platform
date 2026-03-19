import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  RegisterShopDto,
  RegisterShopResponse,
  RequestJoinShopDto,
  RequestJoinShopResponse,
  JoinRequest,
  JoinRequestsResponse,
  OwnerShopSummary,
  ProcessJoinRequestDto,
  ProcessJoinRequestResponse,
  ShopDetailResponse,
  UpdateShopDto,
} from '@inventory-platform/types';

export const shopsApi = {
  register: async (data: RegisterShopDto): Promise<RegisterShopResponse> => {
    const response = await apiClient.post<{ success: boolean; data: RegisterShopResponse }>(
      API_ENDPOINTS.SHOPS.REGISTER,
      data
    );
    // API returns: { success: true, data: { shopId, status } }
    // axios returns response.data which is the entire response body
    // So response = { success: true, data: { shopId, status } }
    // We need to return response.data
    return response.data;
  },

  getShopsByOwnerEmail: async (email: string): Promise<OwnerShopSummary[]> => {
    const response = await apiClient.get<ApiResponse<{ data: OwnerShopSummary[] }>>(
      API_ENDPOINTS.SHOPS.BY_OWNER_EMAIL,
      { email }
    );
    return response.data.data;
  },

  requestToJoin: async (data: RequestJoinShopDto): Promise<RequestJoinShopResponse> => {
    const response = await apiClient.post<ApiResponse<RequestJoinShopResponse>>(
      API_ENDPOINTS.SHOPS.JOIN_REQUEST,
      data
    );
    // apiClient.post already unwraps axios response.data
    // So response is ApiResponse<RequestJoinShopResponse> = { success: true, data: { ... } }
    // We need to return response.data
    return response.data;
  },

  getJoinRequests: async (shopId?: string): Promise<JoinRequest[]> => {
    const params = shopId ? { shopId } : undefined;
    const response = await apiClient.get<ApiResponse<JoinRequestsResponse>>(
      API_ENDPOINTS.SHOPS.JOIN_REQUESTS,
      params as Record<string, string>
    );
    // API returns: { success: true, data: { data: [...] } }
    // apiClient.get already unwraps axios response.data
    // So response is ApiResponse<JoinRequestsResponse> = { success: true, data: { data: [...] } }
    // We need to return response.data.data
    return response.data.data;
  },

  processJoinRequest: async (
    requestId: string,
    data: ProcessJoinRequestDto
  ): Promise<ProcessJoinRequestResponse> => {
    const response = await apiClient.post<ApiResponse<ProcessJoinRequestResponse>>(
      API_ENDPOINTS.SHOPS.PROCESS_JOIN_REQUEST(requestId),
      data
    );
    return response.data;
  },

  /** Get the current user's active shop (uses X-Shop-Id / user's shopId from auth). */
  getActiveShop: async (): Promise<ShopDetailResponse> => {
    const response = await apiClient.get<ApiResponse<ShopDetailResponse>>(
      API_ENDPOINTS.SHOPS.ACTIVE_SHOP
    );
    return response.data;
  },

  /** Update the current user's active shop tagline/location. */
  updateActiveShop: async (data: UpdateShopDto): Promise<ShopDetailResponse> => {
    const response = await apiClient.patch<ApiResponse<ShopDetailResponse>>(
      API_ENDPOINTS.SHOPS.ACTIVE_SHOP,
      data
    );
    return response.data;
  },
};

