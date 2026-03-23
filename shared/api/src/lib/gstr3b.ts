import axios from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, Gstr3bReportResponse } from '@inventory-platform/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const gstr3bApi = {
  getReport: async (period: string): Promise<Gstr3bReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr3bReportResponse>>(
      API_ENDPOINTS.TAXATION.GSTR3B,
      { period }
    );
    return response.data;
  },

  downloadExcel: async (
    period: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;
    const shopId =
      typeof window !== 'undefined'
        ? localStorage.getItem('x_shop_id')
        : null;

    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.TAXATION.GSTR3B_DOWNLOAD}?period=${encodeURIComponent(period)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          ...(shopId ? { 'X-Shop-Id': shopId } : {}),
        },
      }
    );

    const contentDisposition = response.headers['content-disposition'];
    let filename = `GSTR3B_RETURN_${period.replace('-', '_')}.xlsx`;
    if (contentDisposition) {
      const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
      if (match) filename = match[1].trim();
    }
    return { blob: response.data, filename };
  },
};
