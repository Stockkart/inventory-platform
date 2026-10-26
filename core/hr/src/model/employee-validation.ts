import type { HrPaymentMethod, PayType } from './employee.types';

/*
 * Client-side copy of the backend `EmployeeValidator` patterns and messages, so the form can say
 * what is wrong before the round trip. The server re-checks everything; keep these in step with
 * `com.inventory.hr.validation.EmployeeValidator`.
 */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Java `\w` is ASCII-only by default, the same as JS without the `u` flag.
export const UPI_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;
export const ACCOUNT_PATTERN = /^[0-9]{6,18}$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,18}$/;
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]{0,19}$/;
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_NAME = 100;
export const MAX_DESIGNATION = 50;
export const MAX_SALARY = 10_000_000;

/** Form state of the employee form; strings as typed, so empty means "not given". */
export interface EmployeeFormValue {
  name: string;
  phone: string;
  email: string;
  designation: string;
  code: string;
  joinDate: string;
  workStart: string;
  workEnd: string;
  payType: PayType | '';
  salaryAmount: string;
  paymentMethod: HrPaymentMethod;
  bankAccountNumber: string;
  ifsc: string;
  upiId: string;
}

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValue = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  code: '',
  joinDate: '',
  workStart: '',
  workEnd: '',
  payType: '',
  salaryAmount: '',
  paymentMethod: 'CASH',
  bankAccountNumber: '',
  ifsc: '',
  upiId: '',
};

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormValue, string>>;

export interface EmployeeValidationOptions {
  /** Create needs no code (server assigns `EMP-nnn`); update requires one. */
  creating: boolean;
  /** Pay fields are only on the create form for VIEW_SALARIES users. */
  withPay: boolean;
  /** Payment details are only shown (and sent) for VIEW_SALARIES users. */
  withPayment: boolean;
}

/** Amount check from the backend: more than 0, at most ₹1 crore, at most 2 decimals. */
export function salaryAmountError(raw: string): string | undefined {
  const trimmed = raw.trim();
  const amount = Number(trimmed);
  if (!trimmed || !Number.isFinite(amount) || amount <= 0 || amount > MAX_SALARY) {
    return 'Salary must be more than 0, in rupees and paise';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Salary must be more than 0, in rupees and paise';
  }
  return undefined;
}

/** Field-by-field errors; an empty object means the form can be sent. */
export function validateEmployeeForm(
  v: EmployeeFormValue,
  opts: EmployeeValidationOptions,
): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Employee name is required';
  else if (name.length > MAX_NAME) {
    errors.name = `Employee name may have at most ${MAX_NAME} characters`;
  }
  if (v.phone.trim() && !PHONE_PATTERN.test(v.phone.trim())) {
    errors.phone = 'Phone must be a phone number';
  }
  if (v.email.trim() && !EMAIL_PATTERN.test(v.email.trim())) {
    errors.email = 'Email must be an email address';
  }
  if (v.designation.trim().length > MAX_DESIGNATION) {
    errors.designation = `Designation may have at most ${MAX_DESIGNATION} characters`;
  }
  if (v.code.trim()) {
    if (!CODE_PATTERN.test(v.code.trim())) {
      errors.code = "Employee code may have up to 20 letters, digits, '-', '_' or '/'";
    }
  } else if (!opts.creating) {
    errors.code = 'Employee code is required';
  }
  if (v.joinDate && !DATE_PATTERN.test(v.joinDate)) {
    errors.joinDate = 'Join date must be a date like 2025-04-01';
  }
  if (v.workStart || v.workEnd) {
    if (!TIME_PATTERN.test(v.workStart) || !TIME_PATTERN.test(v.workEnd)) {
      errors.workStart = 'Own working hours need both a start and an end like 09:00';
    } else if (v.workStart >= v.workEnd) {
      // HH:mm strings compare correctly as text.
      errors.workStart = 'Work start must be before work end (no overnight hours)';
    }
  }
  // Pay is optional on create; it is checked once an amount is typed (the form picks a pay type).
  if (opts.creating && opts.withPay && v.salaryAmount.trim()) {
    if (!v.payType) errors.payType = 'Pay type is required (monthly salary or daily wage)';
    const amountError = salaryAmountError(v.salaryAmount);
    if (amountError) errors.salaryAmount = amountError;
  }
  if (opts.withPayment) {
    const account = v.bankAccountNumber.trim();
    const ifsc = v.ifsc.trim().toUpperCase();
    const upi = v.upiId.trim();
    if (account && !ACCOUNT_PATTERN.test(account)) {
      errors.bankAccountNumber = 'Bank account number must have 6 to 18 digits';
    }
    if (ifsc && !IFSC_PATTERN.test(ifsc)) {
      errors.ifsc = 'IFSC must have 11 characters like ABCD0123456';
    }
    if (upi && !UPI_PATTERN.test(upi)) {
      errors.upiId = 'UPI ID must look like name@bank';
    }
    if (v.paymentMethod === 'BANK') {
      if (!account) errors.bankAccountNumber ??= 'Bank payment needs the account number and IFSC';
      if (!ifsc) errors.ifsc ??= 'Bank payment needs the account number and IFSC';
    }
    if (v.paymentMethod === 'UPI' && !upi) {
      errors.upiId ??= 'UPI payment needs the UPI ID';
    }
  }
  return errors;
}
