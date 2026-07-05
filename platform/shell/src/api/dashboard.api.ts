import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { DashboardData } from '@inventory-platform/shell/types';
import { DASHBOARD_ENDPOINTS } from './endpoints';

export const dashboardApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get<ApiResponse<DashboardData>>(
      DASHBOARD_ENDPOINTS.BASE
    );
    return response.data;
  },
};
