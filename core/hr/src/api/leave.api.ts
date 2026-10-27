import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  LeaveBalanceRow,
  LeaveDecision,
  LeaveDecisionRequest,
  LeavePreviewParams,
  LeavePreviewResponse,
  LeaveRequestListParams,
  LeaveRequestResponse,
  LeaveRequestsPageResponse,
  RecordLeaveRequest,
} from '@inventory-platform/hr/types';
import { downloadHrBlob, type HrFile } from './download';
import { HR_ENDPOINTS } from './endpoints';

function toQuery(params: object): Record<string, string> {
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    query[key] = String(value);
  });
  return query;
}

/** Staff leave screens and balances (`LeaveController`, `LeaveBalanceController`). */
export const leaveApi = {
  /** VIEW_ATTENDANCE. */
  list: async (params: LeaveRequestListParams = {}): Promise<LeaveRequestsPageResponse> => {
    const response = await apiClient.get<ApiResponse<LeaveRequestsPageResponse>>(
      HR_ENDPOINTS.LEAVE_REQUESTS,
      toQuery(params),
    );
    return response.data;
  },

  /** MARK_ATTENDANCE: recorded leave is approved at once. */
  record: async (body: RecordLeaveRequest): Promise<LeaveRequestResponse> => {
    const response = await apiClient.post<ApiResponse<LeaveRequestResponse>>(
      HR_ENDPOINTS.LEAVE_REQUESTS,
      body,
    );
    return response.data;
  },

  /** MARK_ATTENDANCE: working days and balance left before recording. */
  preview: async (params: LeavePreviewParams): Promise<LeavePreviewResponse> => {
    const response = await apiClient.get<ApiResponse<LeavePreviewResponse>>(
      HR_ENDPOINTS.LEAVE_PREVIEW,
      toQuery(params),
    );
    return response.data;
  },

  /** approve/reject: APPROVE_LEAVE; cancel: APPROVE_LEAVE or MARK_ATTENDANCE. */
  decide: async (
    id: string,
    decision: LeaveDecision,
    body: LeaveDecisionRequest = {},
  ): Promise<LeaveRequestResponse> => {
    const response = await apiClient.post<ApiResponse<LeaveRequestResponse>>(
      HR_ENDPOINTS.LEAVE_DECISION(id, decision),
      body,
    );
    return response.data;
  },

  /**
   * VIEW_ATTENDANCE; `year` like "2026" or "2026-27", default the current leave year.
   * `employeeId` narrows the list to one employee (run B4).
   */
  balances: async (year?: string, employeeId?: string): Promise<LeaveBalanceRow[]> => {
    const query = toQuery({ year, employeeId });
    const response = await apiClient.get<ApiResponse<LeaveBalanceRow[]>>(
      HR_ENDPOINTS.LEAVE_BALANCES,
      Object.keys(query).length > 0 ? query : undefined,
    );
    return response.data ?? [];
  },

  /** VIEW_ATTENDANCE: balances of a leave year as Excel (may answer 503 "busy" under load). */
  balancesExport: (year?: string): Promise<HrFile> =>
    downloadHrBlob(
      HR_ENDPOINTS.LEAVE_BALANCES_EXPORT,
      year ? { year } : undefined,
      `leave-balances${year ? `-${year}` : ''}.xlsx`,
    ),
};
