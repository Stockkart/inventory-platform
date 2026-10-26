import { describe, expect, it } from 'vitest';
import { HR_PERMISSIONS } from '@inventory-platform/access';
import {
  EMPTY_EMPLOYEE_FORM,
  IFSC_PATTERN,
  UPI_PATTERN,
  newEmployeeForm,
  validateEmployeeForm,
  type EmployeeFormValue,
} from './employee-validation';
import {
  employeeToForm,
  fillFromLogin,
  formToRequest,
  linkRequest,
  unlinkedLogins,
} from './employee-form';
import { lockedPermissions, togglePermission, type HrRequiresMap } from './permission-closure';
import { formatInr, formatMonth } from './format';
import type { EmployeeResponse } from './employee.types';

const REQUIRES: HrRequiresMap = {
  MARK_ATTENDANCE: ['VIEW_ATTENDANCE'],
  APPROVE_LEAVE: ['VIEW_ATTENDANCE'],
  ADD_EDIT_EMPLOYEES: ['VIEW_EMPLOYEES'],
  RUN_PAYROLL: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  RECORD_PAYMENTS: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  MANAGE_ADVANCES: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
};

const form = (patch: Partial<EmployeeFormValue>): EmployeeFormValue => ({
  ...EMPTY_EMPLOYEE_FORM,
  name: 'Ravi',
  joinDate: '2026-01-05',
  ...patch,
});
const ALL = { creating: true, withPay: true, withPayment: true };

describe('employee validation mirrors the backend patterns', () => {
  it.each([
    ['HDFC0001234', true],
    ['SBIN0ABC123', true],
    ['hdfc0001234', false],
    ['HDFC1001234', false],
    ['HDFC000123', false],
    ['HDF00001234', false],
  ])('IFSC %s → %s', (ifsc, ok) => {
    expect(IFSC_PATTERN.test(ifsc)).toBe(ok);
  });

  it.each([
    ['ravi.k@okaxis', true],
    ['ra-vi_9@ybl', true],
    ['r@ok', false],
    ['ravi@1bank', false],
    ['ravi', false],
    ['ravi@o', false],
  ])('UPI %s → %s', (upi, ok) => {
    expect(UPI_PATTERN.test(upi)).toBe(ok);
  });

  it('needs a name; code only on update', () => {
    expect(validateEmployeeForm(form({ name: ' ' }), ALL).name).toBe('Employee name is required');
    expect(validateEmployeeForm(form({}), ALL).code).toBeUndefined();
    expect(validateEmployeeForm(form({}), { ...ALL, creating: false }).code).toBe(
      'Employee code is required',
    );
  });

  it('upper-cases IFSC before checking and asks for bank details for BANK', () => {
    expect(
      validateEmployeeForm(
        form({ paymentMethod: 'BANK', bankAccountNumber: '12345678', ifsc: 'hdfc0001234' }),
        ALL,
      ),
    ).toEqual({});
    const missing = validateEmployeeForm(form({ paymentMethod: 'BANK' }), ALL);
    expect(missing.bankAccountNumber).toBe('Bank payment needs the account number and IFSC');
    expect(missing.ifsc).toBe('Bank payment needs the account number and IFSC');
    expect(validateEmployeeForm(form({ paymentMethod: 'UPI', upiId: 'bad' }), ALL).upiId).toBe(
      'UPI ID must look like name@bank',
    );
  });

  it('ignores payment fields when the caller cannot see salaries', () => {
    expect(
      validateEmployeeForm(form({ paymentMethod: 'BANK', ifsc: 'nope' }), {
        creating: true,
        withPay: false,
        withPayment: false,
      }),
    ).toEqual({});
  });

  it('checks pay only once an amount is typed', () => {
    expect(validateEmployeeForm(form({ payType: 'MONTHLY' }), ALL)).toEqual({});
    expect(
      validateEmployeeForm(form({ payType: 'MONTHLY', salaryAmount: '10.005' }), ALL).salaryAmount,
    ).toBe('Salary must be more than 0, in rupees and paise');
  });

  it('requires a join date; the Add form starts at today', () => {
    expect(validateEmployeeForm(form({ joinDate: '' }), ALL).joinDate).toBe(
      'Join date is required',
    );
    expect(validateEmployeeForm(form({ joinDate: '' }), { ...ALL, creating: false }).joinDate).toBe(
      'Join date is required',
    );
    expect(newEmployeeForm(new Date(2026, 8, 7)).joinDate).toBe('2026-09-07');
  });

  it('wants both own working hours, start before end', () => {
    expect(validateEmployeeForm(form({ workStart: '10:00' }), ALL).workStart).toMatch(/both/);
    expect(
      validateEmployeeForm(form({ workStart: '18:00', workEnd: '09:00' }), ALL).workStart,
    ).toMatch(/before/);
  });
});

const employee = (patch: Partial<EmployeeResponse> = {}): EmployeeResponse => ({
  id: 'e1',
  code: 'EMP-001',
  name: 'Ravi',
  status: 'ACTIVE',
  userId: 'u1',
  paymentMethod: 'UPI',
  upiId: 'ravi@okaxis',
  payHidden: false,
  revision: 3,
  ...patch,
});

describe('employee request mapping', () => {
  it('a PUT by a salary viewer sends payment details, the link and the revision back', () => {
    const body = formToRequest(employeeToForm(employee()), {
      creating: false,
      withSalaries: true,
      userId: 'u1',
      revision: 3,
    });
    expect(body).toMatchObject({
      paymentMethod: 'UPI',
      upiId: 'ravi@okaxis',
      userId: 'u1',
      revision: 3,
    });
    expect(body.salaryAmount).toBeNull();
  });

  it('without VIEW_SALARIES every pay and payment field is null (server keeps them)', () => {
    const body = linkRequest(employee({ payHidden: true, upiId: 'ra***@okaxis' }), null, false);
    expect(body).toMatchObject({
      paymentMethod: null,
      upiId: null,
      bankAccountNumber: null,
      userId: null,
    });
  });

  it('never copies masked values into the form', () => {
    expect(employeeToForm(employee({ payHidden: true, upiId: 'ra***@okaxis' })).upiId).toBe('');
  });

  it('without VIEW_SALARIES a PUT sends the stored email back, whatever the form holds', () => {
    const form = { ...employeeToForm(employee({ email: 'old@example.com' })), email: 'new@x.in' };
    const body = formToRequest(form, {
      creating: false,
      withSalaries: false,
      mayChangeLinkAndEmail: false,
      userId: 'u9',
      storedEmail: 'old@example.com',
    });
    expect(body).toMatchObject({ email: 'old@example.com', userId: 'u9' });
  });

  it('a create keeps the typed email without VIEW_SALARIES and never links a login', () => {
    const form = { ...employeeToForm(employee()), email: 'sita@example.com' };
    const body = formToRequest(form, { creating: true, withSalaries: false, userId: 'u9' });
    expect(body).toMatchObject({ email: 'sita@example.com', userId: null });
  });

  it('a create by a salary viewer sends the login picked under "Add from your team"', () => {
    const form = { ...employeeToForm(employee()) };
    expect(formToRequest(form, { creating: true, withSalaries: true, userId: 'u9' }).userId).toBe(
      'u9',
    );
    expect(formToRequest(form, { creating: true, withSalaries: true }).userId).toBeNull();
  });
});

describe('Add from your team (run F9)', () => {
  const sita = { userId: 'u9', name: 'Sita', phone: '9123456780', email: 's@x.in' };
  const mohan = { userId: 'u7', name: 'Mohan', phone: null, email: 'm@x.in' };

  it('offers unlinked logins only, and your own login only to the owner', () => {
    const logins = [
      { userId: 'u1', name: 'Me' },
      sita,
      { userId: 'u8', name: 'Taken', linkedEmployeeId: 'e1' },
    ];
    expect(unlinkedLogins(logins, 'u1', false).map((l) => l.userId)).toEqual(['u9']);
    expect(unlinkedLogins(logins, 'u1', true).map((l) => l.userId)).toEqual(['u1', 'u9']);
  });

  it('fills empty fields, replaces its own earlier fill and keeps what the user typed', () => {
    const empty = employeeToForm(employee({ name: '', phone: null, email: null }));
    const one = fillFromLogin(empty, null, sita);
    expect([one.name, one.phone, one.email]).toEqual(['Sita', '9123456780', 's@x.in']);

    const typed = { ...one, name: 'Sita Devi' };
    const two = fillFromLogin(typed, sita, mohan);
    // Name was typed over, so it stays; phone/email still showed Sita's, so they follow Mohan.
    expect([two.name, two.phone, two.email]).toEqual(['Sita Devi', '', 'm@x.in']);

    const none = fillFromLogin(two, mohan, null);
    expect([none.name, none.phone, none.email]).toEqual(['Sita Devi', '', '']);
  });
});

describe('permission closure', () => {
  it('ticking RUN_PAYROLL also ticks what it needs, in enum order', () => {
    expect(togglePermission([], 'RUN_PAYROLL', true, REQUIRES, HR_PERMISSIONS)).toEqual([
      'VIEW_EMPLOYEES',
      'VIEW_SALARIES',
      'RUN_PAYROLL',
    ]);
  });

  it('locks needed permissions while something needs them; unticking keeps them', () => {
    const row = togglePermission([], 'MARK_ATTENDANCE', true, REQUIRES, HR_PERMISSIONS);
    expect([...lockedPermissions(row, REQUIRES)]).toEqual(['VIEW_ATTENDANCE']);
    const after = togglePermission(row, 'MARK_ATTENDANCE', false, REQUIRES, HR_PERMISSIONS);
    expect(after).toEqual(['VIEW_ATTENDANCE']);
    expect(lockedPermissions(after, REQUIRES).size).toBe(0);
  });
});

describe('formatting', () => {
  it('uses Indian grouping for rupees', () => {
    expect(formatInr(123456.5)).toBe('₹1,23,456.50');
    expect(formatInr(null)).toBe('—');
    expect(formatMonth('2026-04')).toBe('April 2026');
  });
});
