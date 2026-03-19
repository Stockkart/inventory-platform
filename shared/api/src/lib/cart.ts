import axios from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CartResponse,
  AddToCartDto,
  UpdateCartStatusDto,
} from '@inventory-platform/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const cartApi = {
  get: async (): Promise<CartResponse> => {
    const response = await apiClient.get<ApiResponse<CartResponse>>(
      API_ENDPOINTS.CART.BASE
    );
    return response.data;
  },

  add: async (data: AddToCartDto): Promise<CartResponse> => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(
      API_ENDPOINTS.CART.ADD,
      data
    );
    return response.data;
  },

  updateStatus: async (data: UpdateCartStatusDto): Promise<CartResponse> => {
    const response = await apiClient.put<ApiResponse<CartResponse>>(
      API_ENDPOINTS.CART.STATUS,
      data
    );
    return response.data;
  },

  getInvoicePdf: async (
    purchaseId: string,
    printerType?: 'NORMAL' | 'DOT_MATRIX'
  ): Promise<Blob> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.INVOICES.PDF(purchaseId, printerType)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data;
  },
};

