import axios from 'axios';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
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
  InvoiceSettingsResponse,
  UpdateInvoiceSettingsDto,
  PreviewInvoiceSettingsDto,
  InvoiceSeriesResponse,
  UpdateInvoiceSeriesDto,
} from '@inventory-platform/user/types';
import { SHOP_ENDPOINTS } from './endpoints';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

function blobAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const shopId = localStorage.getItem('x_shop_id');
    if (shopId) headers['X-Shop-Id'] = shopId;
  }
  return headers;
}

export const shopsApi = {
  register: async (data: RegisterShopDto): Promise<RegisterShopResponse> => {
    const response = await apiClient.post<{ success: boolean; data: RegisterShopResponse }>(
      SHOP_ENDPOINTS.REGISTER,
      data,
    );
    return response.data;
  },

  getShopsByOwnerEmail: async (email: string): Promise<OwnerShopSummary[]> => {
    const response = await apiClient.get<ApiResponse<{ data: OwnerShopSummary[] }>>(
      SHOP_ENDPOINTS.BY_OWNER_EMAIL,
      { email },
    );
    return response.data.data;
  },

  requestToJoin: async (data: RequestJoinShopDto): Promise<RequestJoinShopResponse> => {
    const response = await apiClient.post<ApiResponse<RequestJoinShopResponse>>(
      SHOP_ENDPOINTS.JOIN_REQUEST,
      data,
    );
    return response.data;
  },

  getJoinRequests: async (shopId?: string): Promise<JoinRequest[]> => {
    const params = shopId ? { shopId } : undefined;
    const response = await apiClient.get<ApiResponse<JoinRequestsResponse>>(
      SHOP_ENDPOINTS.JOIN_REQUESTS,
      params as Record<string, string>,
    );
    return response.data.data;
  },

  processJoinRequest: async (
    requestId: string,
    data: ProcessJoinRequestDto,
  ): Promise<ProcessJoinRequestResponse> => {
    const response = await apiClient.post<ApiResponse<ProcessJoinRequestResponse>>(
      SHOP_ENDPOINTS.PROCESS_JOIN_REQUEST(requestId),
      data,
    );
    return response.data;
  },

  getActiveShop: async (): Promise<ShopDetailResponse> => {
    const response = await apiClient.get<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.ACTIVE_SHOP,
    );
    return response.data;
  },

  getShop: async (shopId: string): Promise<ShopDetailResponse> => {
    const response = await apiClient.get<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.BY_ID(shopId),
    );
    return response.data;
  },

  updateActiveShop: async (data: UpdateShopDto): Promise<ShopDetailResponse> => {
    const response = await apiClient.patch<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.ACTIVE_SHOP,
      data,
    );
    return response.data;
  },

  updateShop: async (shopId: string, data: UpdateShopDto): Promise<ShopDetailResponse> => {
    const response = await apiClient.patch<ApiResponse<ShopDetailResponse>>(
      SHOP_ENDPOINTS.BY_ID(shopId),
      data,
    );
    return response.data;
  },

  getInvoiceSettings: async (): Promise<InvoiceSettingsResponse> => {
    const response = await apiClient.get<ApiResponse<InvoiceSettingsResponse>>(
      SHOP_ENDPOINTS.INVOICE_SETTINGS,
    );
    return response.data;
  },

  updateInvoiceSettings: async (
    data: UpdateInvoiceSettingsDto,
  ): Promise<InvoiceSettingsResponse> => {
    const response = await apiClient.put<ApiResponse<InvoiceSettingsResponse>>(
      SHOP_ENDPOINTS.INVOICE_SETTINGS,
      data,
    );
    return response.data;
  },

  previewInvoiceSettings: async (data: PreviewInvoiceSettingsDto): Promise<string> => {
    const response = await axios.post(
      `${API_BASE_URL}${SHOP_ENDPOINTS.INVOICE_SETTINGS_PREVIEW}`,
      data,
      {
        responseType: 'text',
        headers: {
          ...blobAuthHeaders(),
          'Content-Type': 'application/json',
          Accept: 'text/html',
        },
      },
    );
    const html = typeof response.data === 'string' ? response.data : String(response.data);
    const trimmed = html.trimStart();
    if (trimmed.startsWith('%PDF')) {
      throw new Error(
        'Preview returned a PDF from an outdated API. Restart inventory-api and try again.',
      );
    }
    if (!trimmed.toLowerCase().includes('<html') && !trimmed.toLowerCase().includes('<!doctype')) {
      throw new Error('Preview response was not HTML. Check the API is running the latest build.');
    }
    return html;
  },

  getInvoiceSeries: async (): Promise<InvoiceSeriesResponse> => {
    const response = await apiClient.get<ApiResponse<InvoiceSeriesResponse>>(
      SHOP_ENDPOINTS.INVOICE_SERIES,
    );
    return response.data;
  },

  updateInvoiceSeries: async (data: UpdateInvoiceSeriesDto): Promise<InvoiceSeriesResponse> => {
    const response = await apiClient.put<ApiResponse<InvoiceSeriesResponse>>(
      SHOP_ENDPOINTS.INVOICE_SERIES,
      data,
    );
    return response.data;
  },
};
