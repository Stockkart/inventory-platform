import axios from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, Gstr2ReportResponse } from '@inventory-platform/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const gstr2Api = {
  /**
   * Fetch the full GSTR-2 report for a given period (YYYY-MM).
   */
  getReport: async (period: string): Promise<Gstr2ReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr2ReportResponse>>(
      API_ENDPOINTS.TAXATION.GSTR2,
      { period }
    );
    return response.data;
  },

  /**
   * Download GSTR-2 report as Excel (.xlsx) for the given period.
   */
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
      `${API_BASE_URL}${API_ENDPOINTS.TAXATION.GSTR2_DOWNLOAD}?period=${encodeURIComponent(period)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          ...(shopId ? { 'X-Shop-Id': shopId } : {}),
        },
      }
    );

    const contentDisposition = response.headers['content-disposition'];
    let filename = `GSTR2_RETURN_${period.replace('-', '_')}.xlsx`;
    if (contentDisposition) {
      const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
      if (match) {
        filename = match[1].trim();
      }
    }

    return { blob: response.data, filename };
  },
};
