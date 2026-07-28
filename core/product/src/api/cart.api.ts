import axios from 'axios';
import { apiClient } from '@inventory-platform/api-client';
import type {
  AddToCartDto,
  CartResponse,
  CreateQuotationDto,
  QuotationListResponse,
  UpdateCartStatusDto,
} from '@inventory-platform/product/types';
import type { ApiResponse } from '@inventory-platform/contracts';
import { CART_ENDPOINTS, INVOICE_ENDPOINTS, type PrinterType } from './endpoints';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const cartApi = {
  get: async (purchaseId?: string): Promise<CartResponse> => {
    const queryParams: Record<string, string> = {};
    if (purchaseId) {
      queryParams.purchaseId = purchaseId;
    }
    const response = await apiClient.get<ApiResponse<CartResponse>>(
      CART_ENDPOINTS.BASE,
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    );
    return response.data;
  },

  listQuotations: async (): Promise<QuotationListResponse> => {
    const response = await apiClient.get<ApiResponse<QuotationListResponse>>(
      CART_ENDPOINTS.QUOTATIONS,
    );
    return response.data;
  },

  createQuotation: async (data: CreateQuotationDto): Promise<CartResponse> => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(
      CART_ENDPOINTS.QUOTATIONS,
      data,
    );
    return response.data;
  },

  cancelQuotation: async (purchaseId: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(CART_ENDPOINTS.QUOTATION_BY_ID(purchaseId));
  },

  add: async (data: AddToCartDto): Promise<CartResponse> => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(CART_ENDPOINTS.ADD, data);
    return response.data;
  },

  updateStatus: async (data: UpdateCartStatusDto): Promise<CartResponse> => {
    const response = await apiClient.put<ApiResponse<CartResponse>>(CART_ENDPOINTS.STATUS, data);
    return response.data;
  },

  getInvoicePdf: async (purchaseId: string, printerType?: PrinterType): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const response = await axios.get(
      `${API_BASE_URL}${INVOICE_ENDPOINTS.PDF(purchaseId, printerType)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      },
    );

    return response.data;
  },
};
