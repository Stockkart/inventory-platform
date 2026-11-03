/**
 * Leave DTOs, 1:1 with `com.inventory.hr.rest.dto` (`LeaveController`, `LeaveBalanceController`).
 * Days are numbers with halves (BigDecimal on the server).
 */
import type { PageMeta } from './employee.types';

/** `LeaveRequestStatus` (R6.8). */
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const LEAVE_REQUEST_STATUSES: readonly LeaveRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

/** `LeaveOrigin`: RECORDED requests start APPROVED (R6.6). */
export type LeaveOrigin = 'SELF_SERVICE' | 'RECORDED';

/** `LeaveRequestResponse`. */
export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  leaveTypeId: string;
  /** Display name of the leave type; null when the type no longer exists (run B4). */
  leaveTypeName?: string | null;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  days: number;
  reason?: string | null;
  decisionNote?: string | null;
  status: LeaveRequestStatus;
  origin: LeaveOrigin;
  requestedByUserId?: string | null;
  decidedAt?: string | null;
  decidedByUserId?: string | null;
  leaveYear?: string | null;
  createdAt?: string | null;
}

/** `LeaveRequestsPageResponse`. */
export interface LeaveRequestsPageResponse {
  items: LeaveRequestResponse[];
  page: PageMeta;
}

/** Query of `GET /leave-requests` (size 1–100). */
export interface LeaveRequestListParams {
  status?: LeaveRequestStatus;
  employeeId?: string;
  page?: number;
  size?: number;
}

/** `RecordLeaveRequest`: leave recorded for an employee, approved at once. */
export interface RecordLeaveRequest {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  /** Only when fromDate = toDate. */
  halfDay?: boolean | null;
  reason?: string | null;
}

/** `LeaveDecisionRequest`: approve, reject or cancel; the note is optional. */
export interface LeaveDecisionRequest {
  note?: string | null;
}

export type LeaveDecision = 'approve' | 'reject' | 'cancel';

/** Query of `GET /leave-requests/preview`. */
export interface LeavePreviewParams {
  employeeId: string;
  leaveTypeId: string;
  from: string;
  to: string;
  halfDay?: boolean;
}

/** `LeavePreviewResponse` (R6.13). */
export interface LeavePreviewResponse {
  days: number;
  paid: boolean;
  /** null = no limit. */
  available?: number | null;
  exceedsBalance: boolean;
  leaveYear: string;
}

/** `LeaveBalanceRow.Balance`. */
export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  paid: boolean;
  /** Prorated in the first leave year; null = no limit. */
  quota?: number | null;
  used: number;
  /** quota − used; null = no limit. */
  available?: number | null;
}

/** `LeaveBalanceRow`: one employee's balances for a leave year. */
export interface LeaveBalanceRow {
  employeeId: string;
  code: string;
  name: string;
  leaveYear: string;
  balances: LeaveBalance[];
}

/** `LeaveRequestValidator` limits. */
export const MAX_LEAVE_DAYS = 90;
export const MAX_LEAVE_TEXT_LENGTH = 500;
