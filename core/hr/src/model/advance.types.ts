/**
 * Advance DTOs, 1:1 with `com.inventory.hr.rest.dto` (`AdvanceController`, run B3).
 * Money is BigDecimal on the server and a number here (rupees with paise).
 */
import type { HrPaymentMethod } from './employee.types';

/** Backend `AdvanceStatus`: cancel is allowed only while nothing was recovered. */
export type AdvanceStatus = 'ACTIVE' | 'CANCELLED';

/** `AdvanceResponse`. `recovered` / `outstanding` count only FINALISED payroll runs. */
export interface AdvanceResponse {
  id: string;
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  /** yyyy-MM-dd. */
  date: string;
  amount: number;
  monthlyDeduction: number;
  paidBy: HrPaymentMethod;
  note?: string | null;
  status: AdvanceStatus;
  recovered: number;
  outstanding: number;
  /** false = the accounts entry is still pending; the server retries it on the next call. */
  journalPosted: boolean;
  createdAt?: string | null;
  createdByUserId?: string | null;
}

/** `RecordAdvanceRequest` (`POST /hr/advances`). */
export interface RecordAdvanceRequest {
  employeeId: string;
  /** yyyy-MM-dd, not in the future and within employment. */
  date: string;
  amount: number;
  /** 0 < monthlyDeduction ≤ amount. */
  monthlyDeduction: number;
  paidBy: HrPaymentMethod;
  note?: string | null;
}

/** `ReasonRequest`: advance cancel and payroll reopen. */
export interface ReasonRequest {
  reason: string;
}

/** `AdvanceStatementResponse.Kind`: GIVEN adds to the balance, RECOVERED takes from it. */
export type AdvanceStatementKind = 'GIVEN' | 'RECOVERED';

/** `AdvanceStatementResponse.Row`. */
export interface AdvanceStatementRow {
  /** yyyy-MM-dd; for RECOVERED the last day of the payroll month. */
  date: string;
  kind: AdvanceStatementKind;
  advanceId: string;
  /** YYYY-MM of the payroll run for RECOVERED, null for GIVEN. */
  period?: string | null;
  amount: number;
  balance: number;
  /** Cancelled advance: adds 0 to the balance. */
  cancelled: boolean;
}

/** `AdvanceStatementResponse`, oldest row first. */
export interface AdvanceStatementResponse {
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  rows: AdvanceStatementRow[];
  /** Balance after the last row. */
  outstanding: number;
}

/** Backend `AdvanceValidator.MAX_TEXT_LENGTH` (note and cancel reason). */
export const MAX_ADVANCE_TEXT_LENGTH = 500;
