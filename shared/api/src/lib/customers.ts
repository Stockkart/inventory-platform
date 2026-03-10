import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CustomerResponse,
} from '@inventory-platform/types';

export const customersApi = {
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

