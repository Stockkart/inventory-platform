import axios from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, Gstr1ReportResponse } from '@inventory-platform/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const gstr1Api = {
  /**
   * Fetch the full GSTR-1 report for a given period (YYYY-MM).
   */
  getReport: async (period: string): Promise<Gstr1ReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr1ReportResponse>>(
      API_ENDPOINTS.TAXATION.GSTR1,
      { period }
    );
    return response.data;
  },

  /**
   * Download GSTR-1 report as Excel (.xlsx) for the given period.
   * Returns the blob and suggested filename from Content-Disposition header.
   */
  downloadExcel: async (
    period: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.TAXATION.GSTR1_DOWNLOAD}?period=${encodeURIComponent(period)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    const contentDisposition = response.headers['content-disposition'];
    let filename = `GSTR1_RETURN_${period.replace('-', '_')}.xlsx`;
    if (contentDisposition) {
      const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
      if (match) {
        filename = match[1].trim();
      }
    }

    return { blob: response.data, filename };
  },

  /**
   * Download GSTR-1 as offline-return JSON (gstin/fp/b2b/b2cs/hsn/doc_issue layout).
   */
  downloadOfflineReturnJson: async (
    period: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    const response = await axios.get(
      `${API_BASE_URL}${API_ENDPOINTS.TAXATION.GSTR1_OFFLINE_DOWNLOAD}?period=${encodeURIComponent(period)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    const contentDisposition = response.headers['content-disposition'];
    const parts = period.split('-');
    const fpFallback =
      parts.length === 2 ? `${parts[1].padStart(2, '0')}${parts[0]}` : period.replace(/\D/g, '');
    let filename = `GSTR1_${fpFallback}.json`;
    if (contentDisposition) {
      const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
      if (match) filename = match[1].trim();
    }

    return { blob: response.data, filename };
  },
};
