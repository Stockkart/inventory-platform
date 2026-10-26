/**
 * Self-service DTOs, 1:1 with `HrSelfServiceController` (run B4). Every call works on the
 * caller's own employee, resolved by the server from the signed-in login; nothing here carries
 * another employee's id. `GET /me` returns `EmployeeResponse` (own pay shown, bank/UPI masked),
 * `GET /me/attendance` a `MonthRegisterResponse` with one row and `GET /me/leave/preview` a
 * `LeavePreviewResponse`.
 */
import type { LeaveBalanceRow, LeaveRequestResponse } from './leave.types';
import type { SalaryPaymentStatus } from './payroll.types';

/** `MyLeaveResponse`. */
export interface MyLeaveResponse {
  /** null when not employed in the leave year. */
  balances?: LeaveBalanceRow | null;
  /** Newest first, at most 100. */
  requests: LeaveRequestResponse[];
}

/** Query of `GET /me/leave/preview` (no employee: always the caller). */
export interface MyLeavePreviewParams {
  leaveTypeId: string;
  from: string;
  to: string;
  halfDay?: boolean;
}

/** `RequestLeaveRequest`: a self-service request, PENDING until an approver decides. */
export interface RequestLeaveRequest {
  leaveTypeId: string;
  /** yyyy-MM-dd. */
  fromDate: string;
  /** yyyy-MM-dd. */
  toDate: string;
  /** Only when fromDate = toDate. */
  halfDay?: boolean | null;
  reason?: string | null;
}

/** `MyPayslipResponse`: one finalised month of the caller. */
export interface MyPayslipResponse {
  lineId: string;
  runId: string;
  /** YYYY-MM. */
  period: string;
  /** Own pay, so shown (R10.5). */
  net: number;
  paymentStatus?: SalaryPaymentStatus | null;
  /** yyyy-MM-dd; null = not paid yet. */
  paidAt?: string | null;
}

/** Backend `HrNotificationType` (R6.9). */
export type HrNotificationType = 'LEAVE_REQUESTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';

/** `HrNotificationResponse`. */
export interface HrNotificationResponse {
  id: string;
  type: HrNotificationType;
  leaveRequestId?: string | null;
  /** Plain-English line written by the server. */
  text: string;
  /** ISO instant. */
  createdAt: string;
  read: boolean;
}

/**
 * `HrNotificationsResponse`: at most 20 rows. Without `since` the newest 20; with it the oldest 20
 * newer than `since`. `cursor` is what to send as `since` next time (it may stay put while more
 * rows are waiting).
 */
export interface HrNotificationsResponse {
  items: HrNotificationResponse[];
  cursor?: string | null;
}
