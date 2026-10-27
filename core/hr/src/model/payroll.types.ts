/**
 * Payroll DTOs, 1:1 with `com.inventory.hr.rest.dto` (`PayrollController`, run B3; payments,
 * payslips and the register since B4) and the nested `PayrollRun` / `PayrollLine` classes they
 * expose. Money and half days are numbers.
 */
import type { HrPaymentMethod, PayType } from './employee.types';

/** Backend `PayrollRunStatus`; FINALISING and REOPENING are short-lived claims. */
export type PayrollRunStatus = 'DRAFT' | 'FINALISING' | 'FINALISED' | 'REOPENING';

/** Backend `SalaryPaymentStatus`; null on a line = PENDING. */
export type SalaryPaymentStatus = 'PENDING' | 'PAYING' | 'PAID' | 'UNDOING';

/** Backend `EarningKind`. */
export type EarningKind = 'BASE' | 'OVERTIME' | 'OFF_DAY_WORK' | 'BONUS';

/** Backend `DeductionKind`. */
export type DeductionKind = 'ADVANCE' | 'OTHER';

/** Backend `ManualItemKind`. */
export type ManualItemKind = 'BONUS' | 'OTHER_DEDUCTION';

/** `PayrollCalculator.NO_SALARY` / `DEDUCTIONS_EXCEED_PAY`; unknown codes are shown as sent. */
export type PayrollWarning = 'NO_SALARY' | 'DEDUCTIONS_EXCEED_PAY' | (string & {});

/** `PayrollRun.Totals`. */
export interface PayrollTotals {
  gross: number;
  deductions: number;
  advanceRecovered: number;
  rounding: number;
  net: number;
  employeeCount: number;
}

/** `PayrollRun.JournalHistoryEntry`. */
export interface PayrollJournalHistoryEntry {
  revision?: number | null;
  journalEntryId?: string | null;
  reversalEntryId?: string | null;
}

/** `PayrollRun.ReopenHistoryEntry`. */
export interface PayrollReopenHistoryEntry {
  at?: string | null;
  byUserId?: string | null;
  reason?: string | null;
}

/** `PayrollLine.EmployeeSnapshot` (frozen at finalise). */
export interface PayrollEmployeeSnapshot {
  name: string;
  code: string;
  designation?: string | null;
  joinDate?: string | null;
  exitDate?: string | null;
  payType?: PayType | null;
  rateAmount?: number | null;
  workingMinutes?: number | null;
}

/** `PayrollLine.DayCounts`. */
export interface PayrollDayCounts {
  employedDays?: number | null;
  present?: number | null;
  halfDays?: number | null;
  paidLeave?: number | null;
  unpaidLeave?: number | null;
  absent?: number | null;
  weekOff?: number | null;
  holiday?: number | null;
  /**
   * Work on a week-off or holiday: PRESENT adds 1, HALF_DAY 0.5, so it can be a half (run B5).
   * Daily wage adds it to paid days, so paid days can be more than days employed.
   */
  offDayWorked?: number | null;
  /** Days with no status yet; finalise needs 0. */
  unmarked?: number | null;
  paidDays?: number | null;
  basisDays?: number | null;
}

/** `PayrollLine.EarningItem`. */
export interface PayrollEarningItem {
  kind: EarningKind;
  label: string;
  amount: number;
}

/** `PayrollLine.DeductionItem`. */
export interface PayrollDeductionItem {
  kind: DeductionKind;
  label: string;
  amount: number;
}

/** `PayrollLine.ManualItem` (kept across recalculation). */
export interface PayrollManualItem {
  kind: ManualItemKind;
  note?: string | null;
  amount: number;
}

/** `PayrollLine.AdvanceRecovery`, FIFO by advance date. */
export interface PayrollAdvanceRecovery {
  advanceId: string;
  amount: number;
}

/** `PayrollLineResponse`. */
export interface PayrollLineResponse {
  id: string;
  runId: string;
  employeeId: string;
  period: string;
  /** yyyy-MM-dd first day of the salary month; missing on old data (= calendar month). */
  fromDate?: string | null;
  /** yyyy-MM-dd last day of the salary month; missing on old data. */
  toDate?: string | null;
  employeeSnapshot: PayrollEmployeeSnapshot;
  dayCounts?: PayrollDayCounts | null;
  overtimeMinutes?: number | null;
  earnings: PayrollEarningItem[];
  deductions: PayrollDeductionItem[];
  manualItems: PayrollManualItem[];
  /** null = automatic recovery. */
  advanceOverride?: number | null;
  advanceRecoveries: PayrollAdvanceRecovery[];
  /** null = no advances. */
  advanceOutstandingAfter?: number | null;
  gross: number;
  /** Other deductions plus the advance recovery. */
  totalDeductions: number;
  netBeforeRounding: number;
  rounding: number;
  net: number;
  paymentStatus?: SalaryPaymentStatus | null;
  paymentSeq?: number | null;
  /** yyyy-MM-dd. */
  paidAt?: string | null;
  paymentMethod?: HrPaymentMethod | null;
  paymentReference?: string | null;
  /** Fixed by finalise. */
  frozen: boolean;
  warnings: PayrollWarning[];
  updatedAt?: string | null;
}

/** `PayrollRunResponse`; `lines` only on the single-run read and actions, null in the list. */
export interface PayrollRunResponse {
  id: string;
  /** YYYY-MM. */
  period: string;
  /** yyyy-MM-dd first day of the salary month; missing on old data (= calendar month). */
  fromDate?: string | null;
  /** yyyy-MM-dd last day of the salary month; missing on old data. */
  toDate?: string | null;
  status: PayrollRunStatus;
  revision?: number | null;
  /** null = not computed. */
  totals?: PayrollTotals | null;
  journalEntryId?: string | null;
  journalHistory: PayrollJournalHistoryEntry[];
  reopenHistory: PayrollReopenHistoryEntry[];
  calculatedAt?: string | null;
  finalisedAt?: string | null;
  finalisedByUserId?: string | null;
  createdAt?: string | null;
  createdByUserId?: string | null;
  lines?: PayrollLineResponse[] | null;
}

/** `CreatePayrollRunRequest`: YYYY-MM, not after the current month. */
export interface CreatePayrollRunRequest {
  period: string;
}

/** `SavePayrollAdjustmentsRequest.Item`. */
export interface PayrollAdjustmentItem {
  kind: ManualItemKind;
  note?: string | null;
  amount: number;
}

/** `SavePayrollAdjustmentsRequest`: replaces all manual items; result must leave net ≥ 0. */
export interface SavePayrollAdjustmentsRequest {
  manualItems: PayrollAdjustmentItem[];
  /** null = automatic FIFO recovery. */
  advanceOverride: number | null;
}

/** `UnmarkedDaysResponse.Row`. */
export interface UnmarkedDaysRow {
  employeeId: string;
  code: string;
  name: string;
  /** yyyy-MM-dd, oldest first. */
  dates: string[];
}

/** `UnmarkedDaysResponse` (R8.12). */
export interface UnmarkedDaysResponse {
  period: string;
  employees: UnmarkedDaysRow[];
}

/** Backend `PayrollAdjustmentValidator` limits. */
export const MAX_PAYROLL_MANUAL_ITEMS = 20;
export const MAX_PAYROLL_NOTE_LENGTH = 100;
export const MAX_PAYROLL_REASON_LENGTH = 500;

// ---- payments, payslips, register (run F5, `SalaryPaymentService`, `PayslipService`) ----

/**
 * `RecordSalaryPaymentsRequest`: either `lineIds` (1–50) or `all: true` (the next 50 PENDING lines
 * of the run, `lineIds` empty). Date not in the future and not before the run's month.
 */
export interface RecordSalaryPaymentsRequest {
  lineIds: string[];
  all?: boolean | null;
  /** yyyy-MM-dd. */
  date: string;
  method: HrPaymentMethod;
  /** Cheque, UTR or UPI reference; ≤ 100 characters. */
  reference?: string | null;
}

/** `SalaryPaymentsResponse.LineStatus`. */
export type SalaryPaymentLineStatus = 'PAID' | 'ALREADY_PAID' | 'IN_PROGRESS' | 'NOT_FOUND';

/** `SalaryPaymentsResponse.Line`. */
export interface SalaryPaymentLineResult {
  lineId: string;
  status: SalaryPaymentLineStatus;
  /** Plain-English reason when not paid; null when paid. */
  error?: string | null;
}

/** `SalaryPaymentsResponse`: one call's outcome. */
export interface SalaryPaymentsResponse {
  /** Shared by every line paid in this call; null when nothing was paid. */
  paymentBatchId?: string | null;
  journalEntryId?: string | null;
  paid: number;
  lines: SalaryPaymentLineResult[];
}

/** `ReasonRequest` for undoing one payment (reason optional, ≤ 500). */
export interface UndoSalaryPaymentRequest {
  reason?: string | null;
}

/** `EmailPayslipsRequest`: 1–300 lines of a finalised run. */
export interface EmailPayslipsRequest {
  lineIds: string[];
}

/** `EmailPayslipsResponse.Skipped`: employee without an email address. */
export interface EmailPayslipsSkipped {
  lineId: string;
  employeeId: string;
  code: string;
  name: string;
}

/** `EmailPayslipsResponse`. */
export interface EmailPayslipsResponse {
  queued: number;
  skippedNoEmail: EmailPayslipsSkipped[];
}

/** `GET /{runId}/register?format=`. */
export type SalaryRegisterFormat = 'xlsx' | 'pdf';

/** `SalaryPaymentValidator` / `PayslipService` limits. */
export const MAX_PAYMENT_LINES_PER_CALL = 50;
export const MAX_PAYMENT_REFERENCE_LENGTH = 100;
export const MAX_PAYSLIP_EMAIL_LINES = 300;
