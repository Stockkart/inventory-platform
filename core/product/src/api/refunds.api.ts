import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  CreateRefundDto,
  RefundResponse,
  GetRefundsParams,
  GetRefundsResponse,
  SearchPurchasesParams,
  SearchPurchasesResponse,
} from '@inventory-platform/product/types';
import { PURCHASE_ENDPOINTS, REFUND_ENDPOINTS } from './endpoints';

export const refundsApi = {
  searchPurchases: async (params: SearchPurchasesParams): Promise<SearchPurchasesResponse> => {
    const queryParams: Record<string, string> = {};
    if (params.customer) {
      queryParams.customer = params.customer;
    }
    if (params.invoiceNo) {
      queryParams.invoiceNo = params.invoiceNo;
    }
    if (params.page) {
      queryParams.page = String(params.page);
    }
    if (params.limit) {
      queryParams.limit = String(params.limit);
    }

    const response = await apiClient.get<ApiResponse<SearchPurchasesResponse>>(
      PURCHASE_ENDPOINTS.SEARCH,
      queryParams,
    );
    return response.data;
  },

  create: async (data: CreateRefundDto): Promise<RefundResponse> => {
    const response = await apiClient.post<ApiResponse<RefundResponse>>(REFUND_ENDPOINTS.BASE, data);
    return response.data;
  },

  getAll: async (params?: GetRefundsParams): Promise<GetRefundsResponse> => {
    const queryParams: Record<string, string> = {};
    if (params?.page) {
      queryParams.page = String(params.page);
    }
    if (params?.limit) {
      queryParams.limit = String(params.limit);
    }
    if (params?.invoiceNo) {
      queryParams.invoiceNo = params.invoiceNo;
    }
    if (params?.customerPhone) {
      queryParams.customerPhone = params.customerPhone;
    }
    if (params?.customerId) {
      queryParams.customerId = params.customerId;
    }
    if (params?.customerEmail) {
      queryParams.customerEmail = params.customerEmail;
    }

    const response = await apiClient.get<ApiResponse<GetRefundsResponse>>(
      REFUND_ENDPOINTS.BASE,
      queryParams,
    );
    return response.data;
  },
};
