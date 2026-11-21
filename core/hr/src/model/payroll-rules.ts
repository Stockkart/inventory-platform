/**
 * Client-side mirrors of the payroll and advance rules (backend `AdvanceValidator`,
 * `PayrollAdjustmentValidator`, `PayrollService.assertFinaliseOrder/assertReopenOrder`).
 * The server checks everything again; these only give early, plain messages.
 */
import { formatMonth } from './format';
import type { HrPaymentMethod } from './employee.types';
import type { RecordAdvanceRequest } from './advance.types';
import { MAX_ADVANCE_TEXT_LENGTH } from './advance.types';
import type {
  PayrollAdjustmentItem,
  PayrollLineResponse,
  PayrollRunResponse,
  PayrollRunStatus,
  SavePayrollAdjustmentsRequest,
} from './payroll.types';
import { MAX_PAYROLL_MANUAL_ITEMS, MAX_PAYROLL_NOTE_LENGTH } from './payroll.types';

/** Backend `MAX_AMOUNT` of both validators (₹1 crore). */
export const MAX_HR_AMOUNT = 10_000_000;

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Error for a typed rupee amount, or undefined when valid. `allowZero` for the advance override
 * (0 = recover nothing this month).
 */
export function moneyError(raw: string, opts: { allowZero?: boolean } = {}): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter an amount';
  if (!MONEY_PATTERN.test(trimmed)) return 'Enter rupees and paise, like 1500 or 1500.50';
  const amount = Number(trimmed);
  if (amount > MAX_HR_AMOUNT) return 'This amount is too large';
  if (amount === 0 && !opts.allowZero) return 'Enter an amount more than 0';
  return undefined;
}

// ---- advances ----

export interface AdvanceFormValue {
  employeeId: string;
  date: string;
  amount: string;
  monthlyDeduction: string;
  paidBy: HrPaymentMethod;
  note: string;
}

export type AdvanceFormErrors = Partial<Record<keyof AdvanceFormValue, string>>;

export function validateAdvanceForm(v: AdvanceFormValue, today: string): AdvanceFormErrors {
  const errors: AdvanceFormErrors = {};
  if (!v.employeeId) errors.employeeId = 'Choose an employee';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) errors.date = 'Choose the date the money was given';
  // yyyy-MM-dd strings compare like dates.
  else if (v.date > today) errors.date = 'An advance cannot be dated in the future';
  const amountError = moneyError(v.amount);
  if (amountError) errors.amount = amountError;
  const deductionError = moneyError(v.monthlyDeduction);
  if (deductionError) errors.monthlyDeduction = deductionError;
  else if (!amountError && Number(v.monthlyDeduction) > Number(v.amount)) {
    errors.monthlyDeduction = 'The monthly deduction cannot be more than the advance';
  }
  if (v.note.length > MAX_ADVANCE_TEXT_LENGTH) {
    errors.note = `A note may have at most ${MAX_ADVANCE_TEXT_LENGTH} characters`;
  }
  return errors;
}

export function advanceFormToRequest(v: AdvanceFormValue): RecordAdvanceRequest {
  return {
    employeeId: v.employeeId,
    date: v.date,
    amount: Number(v.amount.trim()),
    monthlyDeduction: Number(v.monthlyDeduction.trim()),
    paidBy: v.paidBy,
    note: v.note.trim() ? v.note.trim() : null,
  };
}

// ---- payroll adjustments ----

/** One editable manual item; amounts stay strings while typing. */
export interface ManualItemDraft {
  kind: PayrollAdjustmentItem['kind'];
  note: string;
  amount: string;
}

export interface AdjustmentsDraft {
  items: ManualItemDraft[];
  /** Whether the user replaces the automatic advance deduction. */
  overrideAdvance: boolean;
  advanceOverride: string;
}

/** Advance recovered on this line (sum of the FIFO allocations). */
export function lineAdvanceRecovered(line: PayrollLineResponse): number {
  return (line.advanceRecoveries ?? []).reduce((sum, r) => sum + r.amount, 0);
}

/** Deductions other than the advance (`totalDeductions` includes the advance). */
export function lineOtherDeductions(line: PayrollLineResponse): number {
  // Paise maths: round so 0.1 + 0.2 style float noise never shows as ₹0.30000000004.
  return Math.round((line.totalDeductions - lineAdvanceRecovered(line)) * 100) / 100;
}

export function adjustmentsDraftFromLine(line: PayrollLineResponse): AdjustmentsDraft {
  return {
    items: (line.manualItems ?? []).map((m) => ({
      kind: m.kind,
      note: m.note ?? '',
      amount: String(m.amount),
    })),
    overrideAdvance: line.advanceOverride != null,
    advanceOverride:
      line.advanceOverride != null
        ? String(line.advanceOverride)
        : String(lineAdvanceRecovered(line)),
  };
}

export interface AdjustmentsErrors {
  /** By item index. */
  items: Record<number, { note?: string; amount?: string }>;
  advanceOverride?: string;
  form?: string;
}

export function validateAdjustments(d: AdjustmentsDraft): AdjustmentsErrors {
  const errors: AdjustmentsErrors = { items: {} };
  if (d.items.length > MAX_PAYROLL_MANUAL_ITEMS) {
    errors.form = `A line may have at most ${MAX_PAYROLL_MANUAL_ITEMS} extra items`;
  }
  d.items.forEach((item, i) => {
    const e: { note?: string; amount?: string } = {};
    const amount = moneyError(item.amount);
    if (amount) e.amount = amount;
    if (item.note.trim().length > MAX_PAYROLL_NOTE_LENGTH) {
      e.note = `A note may have at most ${MAX_PAYROLL_NOTE_LENGTH} characters`;
    }
    if (e.amount || e.note) errors.items[i] = e;
  });
  if (d.overrideAdvance) {
    const e = moneyError(d.advanceOverride, { allowZero: true });
    if (e) errors.advanceOverride = e;
  }
  return errors;
}

export function hasAdjustmentErrors(e: AdjustmentsErrors): boolean {
  return Boolean(e.form || e.advanceOverride || Object.keys(e.items).length > 0);
}

export function adjustmentsToRequest(d: AdjustmentsDraft): SavePayrollAdjustmentsRequest {
  return {
    manualItems: d.items.map((i) => ({
      kind: i.kind,
      note: i.note.trim() ? i.note.trim() : null,
      amount: Number(i.amount.trim()),
    })),
    advanceOverride: d.overrideAdvance ? Number(d.advanceOverride.trim()) : null,
  };
}

// ---- run order (finalise oldest first, reopen newest first) ----

/**
 * Why `run` cannot be finalised yet, mirroring `assertFinaliseOrder`: an earlier month that is
 * not finalised, or a later month already past draft. null = order is fine. Months with no run
 * are not required (backend rule, B3 notes).
 */
export function finaliseOrderBlocker(
  run: Pick<PayrollRunResponse, 'id' | 'period'>,
  runs: readonly Pick<PayrollRunResponse, 'id' | 'period' | 'status'>[],
): string | null {
  // Oldest first so the message names the month to do next.
  const others = runs
    .filter((r) => r.id !== run.id)
    .sort((a, b) => a.period.localeCompare(b.period));
  const earlier = others.find((r) => r.period < run.period && r.status !== 'FINALISED');
  if (earlier)
    return `Finalise ${formatMonth(earlier.period)} first. Months are finalised oldest first.`;
  const later = others.find((r) => r.period > run.period && r.status !== 'DRAFT');
  if (later) {
    return `${formatMonth(
      later.period,
    )} is already finalised, so this month cannot be finalised now.`;
  }
  return null;
}

/** Why a finalised `run` cannot be reopened (`assertReopenOrder`); null = it is the latest. */
export function reopenOrderBlocker(
  run: Pick<PayrollRunResponse, 'id' | 'period'>,
  runs: readonly Pick<PayrollRunResponse, 'id' | 'period' | 'status'>[],
): string | null {
  // Newest first: the newest later month past draft is the one to reopen next.
  const later = runs
    .filter((r) => r.id !== run.id && r.period > run.period && r.status !== 'DRAFT')
    .sort((a, b) => b.period.localeCompare(a.period))[0];
  return later
    ? `Reopen ${formatMonth(later.period)} first. Months are reopened newest first.`
    : null;
}

/** Statuses during which nothing can be done but wait (claims expire after 2 minutes). */
export function isRunBusy(status: PayrollRunStatus): boolean {
  return status === 'FINALISING' || status === 'REOPENING';
}
