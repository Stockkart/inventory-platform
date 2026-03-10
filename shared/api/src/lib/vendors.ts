import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  VendorResponse,
  CreateVendorDto,
  ShopMembership,
} from '@inventory-platform/types';

export const vendorsApi = {
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

