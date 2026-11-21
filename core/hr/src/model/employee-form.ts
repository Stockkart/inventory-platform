import type {
  EmployeeResponse,
  LinkableLoginResponse,
  SaveEmployeeRequest,
} from './employee.types';
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
  /**
   * Update: the login link to keep (null on PUT would unlink). Create: the login picked under
   * "Add from your team", sent only with `mayChangeLinkAndEmail` (VIEW_SALARIES), else null.
   */
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
 *   an email is fine without it, and the picked login (run F9) is sent only with it.
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
    // "Add from your team" (run F9) creates the employee already linked; linking needs
    // VIEW_SALARIES, so without it the link is always null.
    body.userId = mayChangeLinkAndEmail ? opts.userId ?? null : null;
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

/** Shop logins offered under "Add from your team": not linked to anyone, own login owner-only. */
export function unlinkedLogins(
  logins: readonly LinkableLoginResponse[],
  currentUserId: string | null | undefined,
  isOwner: boolean,
): LinkableLoginResponse[] {
  return logins.filter(
    (l) => !l.linkedEmployeeId && (isOwner || !currentUserId || l.userId !== currentUserId),
  );
}

const FILLED_FROM_LOGIN = ['name', 'phone', 'email'] as const;

/**
 * Create form after picking a login under "Add from your team" (run F9): name, phone and email
 * come from the login. A field is only replaced while it is empty or still shows what the
 * previous pick filled in, so anything the user typed stays. `next` null ("New person") clears
 * what the previous pick filled in.
 */
export function fillFromLogin(
  form: EmployeeFormValue,
  previous: LinkableLoginResponse | null,
  next: LinkableLoginResponse | null,
): EmployeeFormValue {
  const out = { ...form };
  for (const key of FILLED_FROM_LOGIN) {
    const before = previous?.[key]?.trim() ?? '';
    const current = form[key].trim();
    if (current === '' || current === before) out[key] = next?.[key]?.trim() ?? '';
  }
  return out;
}
