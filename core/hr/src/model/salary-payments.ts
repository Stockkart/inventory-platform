/**
 * Salary payment rules shared by the payroll screens (R9.1–R9.5), mirroring
 * `SalaryPaymentValidator` and `SalaryPaymentService.pay` (run B4).
 */
import type { HrPaymentMethod } from './employee.types';
import { formatDate, formatInr } from './format';
import { PAYMENT_METHOD_LABELS, SALARY_PAYMENT_STATUS_LABELS } from './labels';
import {
  MAX_PAYMENT_LINES_PER_CALL,
  MAX_PAYMENT_REFERENCE_LENGTH,
  type PayrollLineResponse,
  type RecordSalaryPaymentsRequest,
  type SalaryPaymentsResponse,
} from './payroll.types';

/** Date, method and reference of one payment step (the lines are chosen separately). */
export interface PaymentDetails {
  /** yyyy-MM-dd. */
  date: string;
  method: HrPaymentMethod;
  reference: string;
}

/** Payment dates allowed for a run: from the first of its month up to today. */
export function paymentDateBounds(period: string, today: string): { min: string; max: string } {
  return { min: `${period}-01`, max: today };
}

/** Plain-English problem with the payment form, or null. Same limits as the server. */
export function validatePaymentDetails(
  details: PaymentDetails,
  period: string,
  today: string,
): string | null {
  const { min, max } = paymentDateBounds(period, today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.date)) return 'Choose the date you paid.';
  // yyyy-MM-dd strings compare in date order.
  if (details.date > max) return 'The payment date cannot be in the future.';
  if (details.date < min) return `The payment date cannot be before ${formatDate(min)}.`;
  if (details.reference.trim().length > MAX_PAYMENT_REFERENCE_LENGTH) {
    return `The reference may have at most ${MAX_PAYMENT_REFERENCE_LENGTH} characters.`;
  }
  return null;
}

function detailsToBody(details: PaymentDetails): Omit<RecordSalaryPaymentsRequest, 'lineIds'> {
  return {
    date: details.date,
    method: details.method,
    reference: details.reference.trim() || null,
  };
}

/** What a run of payment calls achieved, by line id. */
export interface PaymentSummary {
  paid: number;
  /** Paid before this step (by someone else or an earlier try). */
  alreadyPaid: string[];
  /** Being paid or undone by someone else right now. */
  inProgress: string[];
  notFound: string[];
  calls: number;
  /** The call that failed, if one did; earlier calls stay paid. */
  error: Error | null;
}

function emptySummary(): PaymentSummary {
  return { paid: 0, alreadyPaid: [], inProgress: [], notFound: [], calls: 0, error: null };
}

function addResponse(summary: PaymentSummary, response: SalaryPaymentsResponse) {
  summary.calls += 1;
  summary.paid += response.paid ?? 0;
  for (const line of response.lines ?? []) {
    if (line.status === 'ALREADY_PAID') summary.alreadyPaid.push(line.lineId);
    else if (line.status === 'IN_PROGRESS') summary.inProgress.push(line.lineId);
    else if (line.status === 'NOT_FOUND') summary.notFound.push(line.lineId);
  }
}

export type PayCall = (body: RecordSalaryPaymentsRequest) => Promise<SalaryPaymentsResponse>;

/**
 * "Pay everyone": repeats `all: true` calls (the server takes the next 50 PENDING lines each
 * time) until a call pays nobody. `expected` is the number of pending lines when the user
 * started; it only bounds the loop (a few spare calls in case others were paid meanwhile) and
 * feeds the progress bar. A failed call stops the loop; what was paid before it stays paid, and
 * running it again picks up the rest.
 */
export async function payEveryoneInChunks(
  pay: PayCall,
  details: PaymentDetails,
  expected: number,
  onProgress?: (paidSoFar: number) => void,
): Promise<PaymentSummary> {
  const summary = emptySummary();
  const maxCalls = Math.ceil(Math.max(expected, 1) / MAX_PAYMENT_LINES_PER_CALL) + 2;
  try {
    while (summary.calls < maxCalls) {
      const response = await pay({ ...detailsToBody(details), lineIds: [], all: true });
      addResponse(summary, response);
      onProgress?.(summary.paid);
      // Nothing paid = no PENDING lines left (or the rest are being paid by someone else).
      if ((response.paid ?? 0) === 0 || (response.lines ?? []).length === 0) break;
    }
  } catch (err) {
    summary.error = err instanceof Error ? err : new Error('Could not record the payment');
  }
  return summary;
}

/** Pays the given lines, at most 50 per call, one call after another. */
export async function payLinesInChunks(
  pay: PayCall,
  details: PaymentDetails,
  lineIds: readonly string[],
  onProgress?: (paidSoFar: number) => void,
): Promise<PaymentSummary> {
  const summary = emptySummary();
  try {
    for (let i = 0; i < lineIds.length; i += MAX_PAYMENT_LINES_PER_CALL) {
      const chunk = lineIds.slice(i, i + MAX_PAYMENT_LINES_PER_CALL);
      addResponse(summary, await pay({ ...detailsToBody(details), lineIds: [...chunk] }));
      onProgress?.(summary.paid);
    }
  } catch (err) {
    summary.error = err instanceof Error ? err : new Error('Could not record the payment');
  }
  return summary;
}

function people(n: number): string {
  return `${n} ${n === 1 ? 'employee' : 'employees'}`;
}

/** Sentences for the result box; `nameOf` turns line ids into employee names. */
export function describePaymentSummary(
  summary: PaymentSummary,
  nameOf: (lineId: string) => string,
): string[] {
  const names = (ids: string[]) => ids.map(nameOf).join(', ');
  const out: string[] = [];
  out.push(summary.paid > 0 ? `Marked ${people(summary.paid)} as paid.` : 'Nobody new was paid.');
  if (summary.alreadyPaid.length > 0) {
    out.push(`Already paid before: ${names(summary.alreadyPaid)}.`);
  }
  if (summary.inProgress.length > 0) {
    out.push(
      `Someone else is paying or undoing these right now: ${names(
        summary.inProgress,
      )}. Refresh in a minute to see the result.`,
    );
  }
  if (summary.notFound.length > 0) {
    out.push(`Not in this payroll any more: ${names(summary.notFound)}.`);
  }
  return out;
}

/** Lines that can be marked paid (PENDING; a missing status is PENDING). */
export function isLinePending(line: PayrollLineResponse): boolean {
  return (line.paymentStatus ?? 'PENDING') === 'PENDING';
}

/** "Pending", "Paid on 9 Oct 2026 by Cash", "Being paid" … for the Payment column. */
export function paymentStatusText(line: PayrollLineResponse): string {
  const status = line.paymentStatus ?? 'PENDING';
  if (status !== 'PAID') return SALARY_PAYMENT_STATUS_LABELS[status];
  const on = line.paidAt ? ` on ${formatDate(line.paidAt)}` : '';
  const by = line.paymentMethod ? ` by ${PAYMENT_METHOD_LABELS[line.paymentMethod]}` : '';
  return `Paid${on}${by}`;
}

/** Net of the pending lines, for "Pay everyone (₹…)" confirmations. */
export function pendingTotal(lines: readonly PayrollLineResponse[]): string {
  return formatInr(lines.filter(isLinePending).reduce((sum, l) => sum + (l.net ?? 0), 0));
}
