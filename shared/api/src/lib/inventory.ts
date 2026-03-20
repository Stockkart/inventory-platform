import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CreateInventoryDto,
  InventoryResponse,
  InventoryListResponse,
  LotsListResponse,
  PaginationInventoryResponse,
  BulkCreateInventoryDto,
  BulkCreateInventoryResponse,
  ParseInvoiceResponse,
  UpdateInventoryRequest,
  InventoryItem,
} from '@inventory-platform/types';
import axios from 'axios';

export const inventoryApi = {
  create: async (data: CreateInventoryDto): Promise<InventoryResponse> => {
    const response = await apiClient.post<ApiResponse<InventoryResponse>>(
      API_ENDPOINTS.INVENTORY.BASE,
      data
    );
    return response.data;
  },

  createBulk: async (
    data: BulkCreateInventoryDto
  ): Promise<BulkCreateInventoryResponse> => {
    const response = await apiClient.post<
      ApiResponse<BulkCreateInventoryResponse>
    >(API_ENDPOINTS.INVENTORY.BULK, data);
    // apiClient.post returns ApiResponse<T> directly
    // So response is ApiResponse<BulkCreateInventoryResponse> = { success: true, data: BulkCreateInventoryResponse }
    // We need to return response.data to get the actual BulkCreateInventoryResponse
    return response.data;
  },

  getAll: async (page = 0, size = 10): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<
      ApiResponse<PaginationInventoryResponse>
    >(API_ENDPOINTS.INVENTORY.BASE, {
      page: String(page),
      size: String(size),
    });
    return response.data;
  },

  getLowStock: async (
    page = 0,
    size = 10
  ): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<
      ApiResponse<PaginationInventoryResponse>
    >(API_ENDPOINTS.INVENTORY.LOW_STOCK, {
      page: String(page),
      size: String(size),
    });
    return response.data;
  },

  search: async (
    query: string,
    page?: number,
    size?: number
  ): Promise<InventoryListResponse> => {
    const params: Record<string, string> = { q: query };
    if (page !== undefined) {
      params.page = String(page);
    }
    if (size !== undefined) {
      params.size = String(size);
    }
    const response = await apiClient.get<ApiResponse<InventoryListResponse>>(
      API_ENDPOINTS.INVENTORY.SEARCH,
      params
    );
    // The API returns { success: true, data: { data: [...], meta: null, page: {...} } }
    // apiClient.get returns r.data which is the full response body: { success: true, data: {...} }
    // So response is ApiResponse<InventoryListResponse> = { success: true, data: InventoryListResponse }
    // response.data is InventoryListResponse = { data: InventoryItem[], meta: unknown | null, page: {...} }
    return response.data;
  },

  searchLots: async (
    search: string,
    page = 0,
    size = 10
  ): Promise<LotsListResponse> => {
    const response = await apiClient.get<ApiResponse<LotsListResponse>>(
      API_ENDPOINTS.INVENTORY.LOTS,
      { search, page: String(page), size: String(size) }
    );
    return response.data;
  },

  getById: async (inventoryId: string): Promise<InventoryItem> => {
    const response = await apiClient.get<ApiResponse<InventoryItem>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId)
    );
    return response.data;
  },

  updateThreshold: async (
    inventoryId: string,
    thresholdCount: number
  ): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId),
      { thresholdCount }
    );
  },

  update: async (
    inventoryId: string,
    data: UpdateInventoryRequest
  ): Promise<InventoryItem> => {
    const response = await apiClient.put<ApiResponse<InventoryItem>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId),
      data
    );
    return response.data;
  },

  parseInvoice: async (imageFile: File): Promise<ParseInvoiceResponse> => {
    const token = localStorage.getItem('auth_token');
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await axios.post<ApiResponse<ParseInvoiceResponse>>(
      `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.PARSE_INVOICE}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data.data;
  },

  parseStockSheet: async (stockFile: File): Promise<ParseInvoiceResponse> => {
    const token = localStorage.getItem('auth_token');
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

    const formData = new FormData();
    formData.append('file', stockFile);

    const response = await axios.post<ApiResponse<ParseInvoiceResponse>>(
      `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.PARSE_STOCK_SHEET}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data.data;
  },
};
