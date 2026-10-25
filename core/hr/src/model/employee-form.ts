import type { EmployeeResponse, SaveEmployeeRequest } from './employee.types';
import { EMPTY_EMPLOYEE_FORM, type EmployeeFormValue } from './employee-validation';

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Edit form state from the server copy. Masked payment values are never put in the form. */
export function employeeToForm(e: EmployeeResponse): EmployeeFormValue {
  const hidden = e.payHidden;
  return {
    ...EMPTY_EMPLOYEE_FORM,
    name: e.name ?? '',
    phone: e.phone ?? '',
    email: e.email ?? '',
    designation: e.designation ?? '',
    code: e.code ?? '',
    joinDate: e.joinDate ?? '',
    workStart: e.workStart ?? '',
    workEnd: e.workEnd ?? '',
    payType: e.payType ?? '',
    salaryAmount: e.salaryAmount != null ? String(e.salaryAmount) : '',
    paymentMethod: e.paymentMethod ?? 'CASH',
    bankAccountNumber: hidden ? '' : e.bankAccountNumber ?? '',
    ifsc: hidden ? '' : e.ifsc ?? '',
    upiId: hidden ? '' : e.upiId ?? '',
  };
}

export interface FormToRequestOptions {
  creating: boolean;
  /** Caller holds VIEW_SALARIES (pay on create, payment details always). */
  withSalaries: boolean;
  /**
   * Caller holds VIEW_SALARIES itself (even when this record's pay is hidden): only then may the
   * login link and the email be changed (run B5). Defaults to `withSalaries`.
   */
  mayChangeLinkAndEmail?: boolean;
  /** Update only: the login link to keep (null on PUT would unlink). */
  userId?: string | null;
  /** Update only: the stored email, sent back unchanged when the caller may not change it. */
  storedEmail?: string | null;
  /** Update only: revision the client last read. */
  revision?: number | null;
}

/**
 * Request body for create/update.
 * - Without VIEW_SALARIES all pay and payment fields are null (the server keeps the stored ones).
 * - With VIEW_SALARIES the PUT replaces payment details, so they are always sent, and only the
 *   ones for the chosen method (the others are cleared, matching what the backend stores).
 * - Pay is only sent on create; later changes use salary revisions.
 * - The login link and email change only with VIEW_SALARIES (`mayChangeLinkAndEmail`); on create
 *   an email is fine without it and the link is always null.
 */
export function formToRequest(
  v: EmployeeFormValue,
  opts: FormToRequestOptions,
): SaveEmployeeRequest {
  const body: SaveEmployeeRequest = {
    name: v.name.trim(),
    phone: orNull(v.phone),
    email: orNull(v.email),
    designation: orNull(v.designation),
    code: orNull(v.code),
    joinDate: v.joinDate || null,
    workStart: v.workStart || null,
    workEnd: v.workEnd || null,
    payType: null,
    salaryAmount: null,
    salaryEffectiveFrom: null,
    paymentMethod: null,
    bankAccountNumber: null,
    ifsc: null,
    upiId: null,
  };
  if (opts.withSalaries) {
    if (opts.creating && v.payType && v.salaryAmount.trim()) {
      body.payType = v.payType;
      body.salaryAmount = Number(v.salaryAmount);
    }
    body.paymentMethod = v.paymentMethod;
    if (v.paymentMethod === 'BANK') {
      body.bankAccountNumber = orNull(v.bankAccountNumber);
      body.ifsc = v.ifsc.trim() ? v.ifsc.trim().toUpperCase() : null;
    } else if (v.paymentMethod === 'UPI') {
      body.upiId = orNull(v.upiId);
    }
  }
  const mayChangeLinkAndEmail = opts.mayChangeLinkAndEmail ?? opts.withSalaries;
  if (opts.creating) {
    // The create form has no login picker; linking needs VIEW_SALARIES and is done on the profile.
    body.userId = null;
  } else {
    // Without VIEW_SALARIES the server refuses any other link (null included) or email (403),
    // so the stored ones are sent back unchanged.
    body.userId = opts.userId ?? null;
    if (!mayChangeLinkAndEmail) body.email = opts.storedEmail ?? null;
    body.revision = opts.revision ?? null;
  }
  return body;
}

/** PUT body that changes only the login link and keeps every other field as stored. */
export function linkRequest(
  e: EmployeeResponse,
  userId: string | null,
  withSalaries: boolean,
): SaveEmployeeRequest {
  return formToRequest(employeeToForm(e), {
    creating: false,
    // Masked copies cannot be sent back; without the real values fall back to "keep" (null).
    withSalaries: withSalaries && !e.payHidden,
    mayChangeLinkAndEmail: withSalaries,
    userId,
    storedEmail: e.email ?? null,
    revision: e.revision ?? null,
  });
}
