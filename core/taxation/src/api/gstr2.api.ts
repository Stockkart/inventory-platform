import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { Gstr2ReportResponse } from '@inventory-platform/taxation/types';
import { downloadTaxationBlob } from './download';
import { TAXATION_ENDPOINTS } from './endpoints';

export const gstr2Api = {
  getReport: async (period: string): Promise<Gstr2ReportResponse> => {
    const response = await apiClient.get<ApiResponse<Gstr2ReportResponse>>(
      TAXATION_ENDPOINTS.GSTR2,
      { period },
    );
    return response.data;
  },

  downloadExcel: async (period: string): Promise<{ blob: Blob; filename: string }> => {
    return downloadTaxationBlob(
      TAXATION_ENDPOINTS.GSTR2_DOWNLOAD,
      { period },
      `GSTR2_RETURN_${period.replace('-', '_')}.xlsx`,
    );
  },
};
