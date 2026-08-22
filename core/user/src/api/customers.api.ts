import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  CreateCustomerDto,
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerDto,
} from '@inventory-platform/user/types';
import { CUSTOMER_ENDPOINTS } from './endpoints';

export type CustomersListParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export const customersApi = {
  create: async (data: CreateCustomerDto): Promise<CustomerResponse> => {
    const response = await apiClient.post<ApiResponse<CustomerResponse>>(
      CUSTOMER_ENDPOINTS.BASE,
      data,
    );
    return response.data;
  },

  list: async (params: CustomersListParams = {}): Promise<CustomerListResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.q) queryParams.q = params.q;
    const response = await apiClient.get<ApiResponse<CustomerListResponse>>(
      CUSTOMER_ENDPOINTS.BASE,
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    );
    return response.data;
  },

  update: async (customerId: string, data: UpdateCustomerDto): Promise<CustomerResponse> => {
    const response = await apiClient.patch<ApiResponse<CustomerResponse>>(
      CUSTOMER_ENDPOINTS.BY_ID(customerId),
      data,
    );
    return response.data;
  },

  searchByPhone: async (phone: string): Promise<CustomerResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerResponse>>(
        CUSTOMER_ENDPOINTS.SEARCH,
        { phone },
      );
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  /**
   * The shop's customer with this name, or null when the name does not decide it.
   *
   * Most customers have no phone recorded, so the name is often the only thing
   * the counter can search on. The server returns a customer only when the name
   * fits exactly one, since several shops can trade under the same name.
   */
  searchByName: async (name: string): Promise<CustomerResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerResponse>>(
        CUSTOMER_ENDPOINTS.SEARCH,
        { name },
      );
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  searchByEmail: async (email: string): Promise<CustomerResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CustomerResponse>>(
        CUSTOMER_ENDPOINTS.SEARCH,
        { email },
      );
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  },
};
