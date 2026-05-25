import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CustomerProductHistoryResponse,
  GetCustomerProductHistoryParams,
  GetPurchasesParams,
  PurchaseHistoryResponse,
} from '@inventory-platform/types';

export const purchasesApi = {
  getAll: async (params?: GetPurchasesParams): Promise<PurchaseHistoryResponse> => {
    // Convert params to query string format
    const queryParams: Record<string, string> = {};
    if (params?.page !== undefined) {
      queryParams.page = params.page.toString();
    }
    if (params?.limit !== undefined) {
      queryParams.limit = params.limit.toString();
    }
    if (params?.order) {
      queryParams.order = params.order;
    }
    if (params?.status) {
      queryParams.status = params.status;
    }

    const response = await apiClient.get<ApiResponse<PurchaseHistoryResponse>>(
      API_ENDPOINTS.PURCHASES.BASE,
      queryParams
    );
    // API returns: { success: true, data: { purchases: [...], page, limit, total, totalPages } }
    // apiClient.get already unwraps axios response.data
    // So response is ApiResponse<PurchaseHistoryResponse> = { success: true, data: { ... } }
    // We need to return response.data
    return response.data;
  },

  /**
   * Recent prices/quantities the given customer paid for any of the requested inventory lines.
   * Returns an empty history map when there is no customer match or no prior purchases.
   */
  getCustomerProductHistory: async (
    params: GetCustomerProductHistoryParams
  ): Promise<CustomerProductHistoryResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.customerId) {
      queryParams.customerId = params.customerId;
    }
    if (params.customerPhone) {
      queryParams.customerPhone = params.customerPhone;
    }
    if (params.inventoryIds && params.inventoryIds.length > 0) {
      queryParams.inventoryIds = params.inventoryIds.join(',');
    }
    if (params.perItemLimit !== undefined) {
      queryParams.perItemLimit = String(params.perItemLimit);
    }

    const response = await apiClient.get<
      ApiResponse<CustomerProductHistoryResponse>
    >(API_ENDPOINTS.PURCHASES.CUSTOMER_PRODUCT_HISTORY, queryParams);
    return response.data;
  },
};

