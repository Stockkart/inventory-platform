import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AdvanceResponse,
  AdvanceStatementResponse,
  RecordAdvanceRequest,
} from '@inventory-platform/hr/types';
import { HR_ENDPOINTS } from './endpoints';

/** Salary advances (`AdvanceController`); every call needs MANAGE_ADVANCES. */
export const advancesApi = {
  /** One employee's advances, or the shop's newest 500 when `employeeId` is left out. */
  list: async (employeeId?: string): Promise<AdvanceResponse[]> => {
    const response = await apiClient.get<ApiResponse<AdvanceResponse[]>>(
      HR_ENDPOINTS.ADVANCES,
      employeeId ? { employeeId } : undefined,
    );
    return response.data ?? [];
  },

  /** Records the advance and its accounts entry (Dr Staff Advances / Cr Cash or Bank). */
  record: async (body: RecordAdvanceRequest): Promise<AdvanceResponse> => {
    const response = await apiClient.post<ApiResponse<AdvanceResponse>>(
      HR_ENDPOINTS.ADVANCES,
      body,
    );
    return response.data;
  },

  /** Needs a reason; refused once any of it was recovered by finalised payroll. */
  cancel: async (id: string, reason: string): Promise<AdvanceResponse> => {
    const response = await apiClient.post<ApiResponse<AdvanceResponse>>(
      HR_ENDPOINTS.ADVANCE_CANCEL(id),
      { reason },
    );
    return response.data;
  },

  statement: async (employeeId: string): Promise<AdvanceStatementResponse> => {
    const response = await apiClient.get<ApiResponse<AdvanceStatementResponse>>(
      HR_ENDPOINTS.EMPLOYEE_ADVANCE_STATEMENT(employeeId),
    );
    return response.data;
  },
};
