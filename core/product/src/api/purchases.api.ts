import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  PurchaseHistoryResponse,
  GetPurchasesParams,
  SearchPurchasesParams,
  SearchPurchasesResponse,
  GetCustomerProductHistoryParams,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { PURCHASE_ENDPOINTS } from './endpoints';

export const purchasesApi = {
  search: async (params: SearchPurchasesParams): Promise<SearchPurchasesResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.customerEmail) queryParams.customerEmail = params.customerEmail;
    if (params.customerPhone) queryParams.customerPhone = params.customerPhone;
    if (params.customer) queryParams.customer = params.customer;
    if (params.invoiceNo) queryParams.invoiceNo = params.invoiceNo;
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await apiClient.get<ApiResponse<SearchPurchasesResponse>>(
      PURCHASE_ENDPOINTS.SEARCH,
      queryParams,
    );
    return response.data;
  },

  getAll: async (params?: GetPurchasesParams): Promise<PurchaseHistoryResponse> => {
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
      PURCHASE_ENDPOINTS.BASE,
      queryParams,
    );
    return response.data;
  },

  getCustomerProductHistory: async (
    params: GetCustomerProductHistoryParams,
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
      PURCHASE_ENDPOINTS.CUSTOMER_PRODUCT_HISTORY,
      queryParams,
    );
    return response.data;
  },
};
