import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AttendanceHistoryResponse,
  AttendanceRowResponse,
  DailyRegisterResponse,
  MarkUnmarkedPresentRequest,
  MarkUnmarkedPresentResponse,
  MonthRegisterResponse,
  SaveAttendanceDaysRequest,
} from '@inventory-platform/hr/types';
import { downloadHrBlob, type HrFile } from './download';
import { HR_ENDPOINTS } from './endpoints';

/** Attendance registers and marks (`AttendanceController`). */
export const attendanceApi = {
  /** VIEW_ATTENDANCE; `asOf` defaults to today on the server. */
  daily: async (asOf?: string): Promise<DailyRegisterResponse> => {
    const response = await apiClient.get<ApiResponse<DailyRegisterResponse>>(
      HR_ENDPOINTS.ATTENDANCE_DAILY,
      asOf ? { asOf } : undefined,
    );
    return response.data;
  },

  /** MARK_ATTENDANCE; ≤ 500 rows, unchanged rows are skipped server-side too. */
  saveDays: async (body: SaveAttendanceDaysRequest): Promise<AttendanceRowResponse[]> => {
    const response = await apiClient.put<ApiResponse<AttendanceRowResponse[]>>(
      HR_ENDPOINTS.ATTENDANCE_DAYS,
      body,
    );
    return response.data ?? [];
  },

  /** MARK_ATTENDANCE. */
  markUnmarkedPresent: async (
    body: MarkUnmarkedPresentRequest,
  ): Promise<MarkUnmarkedPresentResponse> => {
    const response = await apiClient.post<ApiResponse<MarkUnmarkedPresentResponse>>(
      HR_ENDPOINTS.ATTENDANCE_MARK_UNMARKED_PRESENT,
      body,
    );
    return response.data;
  },

  /** VIEW_ATTENDANCE; `employeeId` narrows the register to one person (calendar view). */
  month: async (period: string, employeeId?: string): Promise<MonthRegisterResponse> => {
    const params: Record<string, string> = { period };
    if (employeeId) params.employeeId = employeeId;
    const response = await apiClient.get<ApiResponse<MonthRegisterResponse>>(
      HR_ENDPOINTS.ATTENDANCE_MONTH,
      params,
    );
    return response.data;
  },

  /** MARK_ATTENDANCE. */
  history: async (employeeId: string, date: string): Promise<AttendanceHistoryResponse> => {
    const response = await apiClient.get<ApiResponse<AttendanceHistoryResponse>>(
      HR_ENDPOINTS.ATTENDANCE_HISTORY,
      { employeeId, date },
    );
    return response.data;
  },

  /** VIEW_ATTENDANCE: the month register as Excel (may answer 503 "busy" under load). */
  monthExport: (period: string): Promise<HrFile> =>
    downloadHrBlob(HR_ENDPOINTS.ATTENDANCE_MONTH_EXPORT, { period }, `attendance-${period}.xlsx`),
};
