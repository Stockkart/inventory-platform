import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { Gstr3bReportResponse } from '@inventory-platform/taxation/types';
import { downloadTaxationBlob } from './download';
import { TAXATION_ENDPOINTS } from './endpoints';

export const gstr3bApi = {
  getReport: async (period: string): Promise<Gstr3bReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr3bReportResponse>>(
      TAXATION_ENDPOINTS.GSTR3B,
      { period },
    );
    return response.data;
  },

  downloadExcel: async (period: string): Promise<{ blob: Blob; filename: string }> => {
    return downloadTaxationBlob(
      TAXATION_ENDPOINTS.GSTR3B_DOWNLOAD,
      { period },
      `GSTR3B_RETURN_${period.replace('-', '_')}.xlsx`,
    );
  },
};
