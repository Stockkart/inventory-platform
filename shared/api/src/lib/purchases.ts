import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  PurchaseHistoryResponse,
  GetPurchasesParams,
  SearchPurchasesParams,
  SearchPurchasesResponse,
  GetCustomerProductHistoryParams,
  CustomerProductHistoryResponse,
} from '@inventory-platform/types';

export const purchasesApi = {
  search: async (
    params: SearchPurchasesParams
  ): Promise<SearchPurchasesResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.customerEmail) queryParams.customerEmail = params.customerEmail;
    if (params.customerPhone) queryParams.customerPhone = params.customerPhone;
    if (params.customerName) queryParams.customerName = params.customerName;
    if (params.invoiceNo) queryParams.invoiceNo = params.invoiceNo;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await apiClient.get<ApiResponse<SearchPurchasesResponse>>(
      API_ENDPOINTS.PURCHASES.SEARCH,
      queryParams
    );
    return response.data;
  },

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

  getCustomerProductHistory: async (
    params: GetCustomerProductHistoryParams
  ): Promise<CustomerProductHistoryResponse> => {
    const queryParams: Record<string, string> = {
      sellableRefs: params.sellableRefs.join(','),
    };
    if (params.customerId) queryParams.customerId = params.customerId;
    if (params.customerPhone) queryParams.customerPhone = params.customerPhone;
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.excludePurchaseId) {
      queryParams.excludePurchaseId = params.excludePurchaseId;
    }

    const response = await apiClient.get<ApiResponse<CustomerProductHistoryResponse>>(
      API_ENDPOINTS.PURCHASES.CUSTOMER_PRODUCT_HISTORY,
      queryParams
    );
    return response.data;
  },
};

