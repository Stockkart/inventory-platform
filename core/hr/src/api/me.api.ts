import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  EmployeeResponse,
  HrNotificationsResponse,
  LeavePreviewResponse,
  LeaveRequestResponse,
  MonthRegisterResponse,
  MyLeavePreviewParams,
  MyLeaveResponse,
  MyPayslipResponse,
  RequestLeaveRequest,
} from '@inventory-platform/hr/types';
import { downloadHrBlob, type HrFile } from './download';
import { HR_ENDPOINTS } from './endpoints';

/**
 * Self-service (`HrSelfServiceController`). No HR permission is needed: the server works on the
 * caller's own employee only (404 "not linked" otherwise), except notifications, which every
 * member of the shop has.
 */
export const meApi = {
  /** Own profile with own pay; bank account and UPI id come back masked. */
  profile: async (): Promise<EmployeeResponse> => {
    const response = await apiClient.get<ApiResponse<EmployeeResponse>>(HR_ENDPOINTS.ME);
    return response.data;
  },

  /** Own month as a one-row register; `period` YYYY-MM, default this month. */
  attendance: async (period?: string): Promise<MonthRegisterResponse> => {
    const response = await apiClient.get<ApiResponse<MonthRegisterResponse>>(
      HR_ENDPOINTS.ME_ATTENDANCE,
      period ? { period } : undefined,
    );
    return response.data;
  },

  /** Own balances for the leave year (default current) and own requests, newest first. */
  leave: async (year?: string): Promise<MyLeaveResponse> => {
    const response = await apiClient.get<ApiResponse<MyLeaveResponse>>(
      HR_ENDPOINTS.ME_LEAVE,
      year ? { year } : undefined,
    );
    return response.data;
  },

  /** Working days a request would cover and the balance left before it. */
  previewLeave: async (params: MyLeavePreviewParams): Promise<LeavePreviewResponse> => {
    const query: Record<string, string> = {
      leaveTypeId: params.leaveTypeId,
      from: params.from,
      to: params.to,
    };
    if (params.halfDay) query.halfDay = 'true';
    const response = await apiClient.get<ApiResponse<LeavePreviewResponse>>(
      HR_ENDPOINTS.ME_LEAVE_PREVIEW,
      query,
    );
    return response.data;
  },

  /** "Ask for leave": PENDING until an approver decides; approvers are notified. */
  requestLeave: async (body: RequestLeaveRequest): Promise<LeaveRequestResponse> => {
    const response = await apiClient.post<ApiResponse<LeaveRequestResponse>>(
      HR_ENDPOINTS.ME_LEAVE_REQUESTS,
      body,
    );
    return response.data;
  },

  /** Cancel an own PENDING or APPROVED request in a month that is not locked. */
  cancelLeave: async (id: string): Promise<LeaveRequestResponse> => {
    const response = await apiClient.post<ApiResponse<LeaveRequestResponse>>(
      HR_ENDPOINTS.ME_LEAVE_CANCEL(id),
      {},
    );
    return response.data;
  },

  /** Own payslips of finalised months. */
  payslips: async (): Promise<MyPayslipResponse[]> => {
    const response = await apiClient.get<ApiResponse<MyPayslipResponse[]>>(
      HR_ENDPOINTS.ME_PAYSLIPS,
    );
    return response.data ?? [];
  },

  /** Own payslip PDF (works while the plan is expired). */
  payslipPdf: (lineId: string): Promise<HrFile> =>
    downloadHrBlob(HR_ENDPOINTS.ME_PAYSLIP_PDF(lineId), undefined, 'payslip.pdf'),

  /** Inbox rows newer than `since` (ISO instant), at most 20; keep the returned cursor. */
  notifications: async (since?: string | null): Promise<HrNotificationsResponse> => {
    const response = await apiClient.get<ApiResponse<HrNotificationsResponse>>(
      HR_ENDPOINTS.ME_NOTIFICATIONS,
      since ? { since } : undefined,
    );
    return response.data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await apiClient.post<ApiResponse<{ read: boolean }>>(HR_ENDPOINTS.ME_NOTIFICATION_READ(id));
  },

  /** Returns how many rows were marked. */
  markAllNotificationsRead: async (): Promise<number> => {
    const response = await apiClient.post<ApiResponse<{ marked: number }>>(
      HR_ENDPOINTS.ME_NOTIFICATIONS_READ_ALL,
    );
    return response.data?.marked ?? 0;
  },
};
