import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CustomerResponse,
  CustomerListResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@inventory-platform/types';

export const customersApi = {
  create: async (data: CreateCustomerDto): Promise<CustomerResponse> => {
    const response = await apiClient.post<ApiResponse<CustomerResponse>>(
      API_ENDPOINTS.CUSTOMERS.BASE,
      data
    );
    return response.data;
  },

  list: async (params?: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<CustomerListResponse> => {
    const queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.q) queryParams.q = params.q;
    const response = await apiClient.get<ApiResponse<CustomerListResponse>>(
      API_ENDPOINTS.CUSTOMERS.BASE,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
    return response.data;
  },

  update: async (
    customerId: string,
    data: UpdateCustomerDto
  ): Promise<CustomerResponse> => {
    const response = await apiClient.patch<ApiResponse<CustomerResponse>>(
      API_ENDPOINTS.CUSTOMERS.BY_ID(customerId),
      data
    );
    return response.data;
  },

  searchByPhone: async (phone: string): Promise<CustomerResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerResponse>>(
        API_ENDPOINTS.CUSTOMERS.SEARCH,
        { phone }
      );
      return response.data;
    } catch (error: any) {
      // If customer not found, return null instead of throwing
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  searchByEmail: async (email: string): Promise<CustomerResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerResponse>>(
        API_ENDPOINTS.CUSTOMERS.SEARCH,
        { email }
      );
      return response.data;
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

