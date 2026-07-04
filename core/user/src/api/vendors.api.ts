import { apiClient } from '@inventory-platform/api-client';
import type {
  ApiResponse,
  CreateVendorDto,
  UpdateVendorDto,
  VendorListResponse,
  VendorResponse,
} from '@inventory-platform/types';
import { VENDOR_ENDPOINTS } from './endpoints';

export type VendorsListParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export const vendorsApi = {
  list: async (params: VendorsListParams = {}): Promise<VendorListResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.q) queryParams.q = params.q;
    const response = await apiClient.get<ApiResponse<VendorListResponse>>(
      VENDOR_ENDPOINTS.BASE,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
    return response.data;
  },

  update: async (
    vendorId: string,
    data: UpdateVendorDto
  ): Promise<VendorResponse> => {
    const response = await apiClient.patch<ApiResponse<VendorResponse>>(
      VENDOR_ENDPOINTS.BY_ID(vendorId),
      data
    );
    return response.data;
  },

  create: async (data: CreateVendorDto): Promise<VendorResponse> => {
    const response = await apiClient.post<ApiResponse<VendorResponse>>(
      VENDOR_ENDPOINTS.BASE,
      data
    );
    return response.data;
  },

  search: async (query: string): Promise<VendorResponse[]> => {
    try {
      const response = await apiClient.get<ApiResponse<VendorResponse[]>>(
        VENDOR_ENDPOINTS.SEARCH,
        { q: query }
      );
      return response.data || [];
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        return [];
      }
      throw error;
    }
  },

  getById: async (vendorId: string): Promise<VendorResponse> => {
    const response = await apiClient.get<ApiResponse<VendorResponse>>(
      VENDOR_ENDPOINTS.BY_ID(vendorId)
    );
    return response.data;
  },
};
