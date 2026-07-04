import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse, Gstr1ReportResponse } from '@inventory-platform/types';
import { downloadTaxationBlob } from './download';
import { TAXATION_ENDPOINTS } from './endpoints';

export const gstr1Api = {
  getReport: async (period: string): Promise<Gstr1ReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr1ReportResponse>>(
      TAXATION_ENDPOINTS.GSTR1,
      { period }
    );
    return response.data;
  },

  downloadExcel: async (period: string): Promise<{ blob: Blob; filename: string }> => {
    return downloadTaxationBlob(
      TAXATION_ENDPOINTS.GSTR1_DOWNLOAD,
      { period },
      `GSTR1_RETURN_${period.replace('-', '_')}.xlsx`
    );
  },

  downloadOfflineReturnJson: async (
    period: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const parts = period.split('-');
    const fpFallback =
      parts.length === 2 ? `${parts[1].padStart(2, '0')}${parts[0]}` : period.replace(/\D/g, '');
    return downloadTaxationBlob(
      TAXATION_ENDPOINTS.GSTR1_OFFLINE_DOWNLOAD,
      { period },
      `GSTR1_${fpFallback}.json`
    );
  },
};
