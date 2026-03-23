import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  VendorResponse,
  VendorListResponse,
  CreateVendorDto,
  UpdateVendorDto,
  ShopMembership,
} from '@inventory-platform/types';

export const vendorsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<VendorListResponse> => {
    const queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.q) queryParams.q = params.q;
    const response = await apiClient.get<ApiResponse<VendorListResponse>>(
      API_ENDPOINTS.VENDORS.BASE,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
    return response.data;
  },

  update: async (
    vendorId: string,
    data: UpdateVendorDto
  ): Promise<VendorResponse> => {
    const response = await apiClient.patch<ApiResponse<VendorResponse>>(
      API_ENDPOINTS.VENDORS.BY_ID(vendorId),
      data
    );
    return response.data;
  },

  create: async (data: CreateVendorDto): Promise<VendorResponse> => {
    const response = await apiClient.post<ApiResponse<VendorResponse>>(
      API_ENDPOINTS.VENDORS.BASE,
      data
    );
    return response.data;
  },

  search: async (query: string): Promise<VendorResponse[]> => {
    try {
      const response = await apiClient.get<ApiResponse<VendorResponse[]>>(
        API_ENDPOINTS.VENDORS.SEARCH,
        { q: query }
      );
      return response.data || [];
    } catch (error: any) {
      // If vendor not found, return empty array instead of throwing
      if (error?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  getById: async (vendorId: string): Promise<VendorResponse> => {
    const response = await apiClient.get<ApiResponse<VendorResponse>>(
      API_ENDPOINTS.VENDORS.BY_ID(vendorId)
    );
    return response.data;
  },

  /**
   * Get shops for a vendor when the vendor is a StockKart user.
   * Used when assigning credit to vendor's shop in product registration.
   */
  getVendorShops: async (vendorId: string): Promise<ShopMembership[]> => {
    const response = await apiClient.get<
      ApiResponse<{ data: ShopMembership[] }>
    >(API_ENDPOINTS.VENDORS.SHOPS(vendorId));
    return response.data?.data ?? [];
  },
};

