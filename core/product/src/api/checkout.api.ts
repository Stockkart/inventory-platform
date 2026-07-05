import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { CheckoutResponse, CreateCheckoutDto } from '@inventory-platform/product/types';
import { CHECKOUT_ENDPOINTS } from './endpoints';

export const checkoutApi = {
  create: async (data: CreateCheckoutDto): Promise<CheckoutResponse> => {
    const response = await apiClient.post<ApiResponse<CheckoutResponse>>(
      CHECKOUT_ENDPOINTS.BASE,
      data
    );
    return response.data;
  },
};
