import { describe, expect, it } from 'vitest';
import {
  adjustmentsToRequest,
  finaliseOrderBlocker,
  lineOtherDeductions,
  moneyError,
  reopenOrderBlocker,
  validateAdjustments,
  validateAdvanceForm,
  type AdvanceFormValue,
} from './payroll-rules';
import type { PayrollLineResponse, PayrollRunStatus } from './payroll.types';

const TODAY = '2026-10-15';

const form = (patch: Partial<AdvanceFormValue> = {}): AdvanceFormValue => ({
  employeeId: 'e1',
  date: '2026-10-10',
  amount: '5000',
  monthlyDeduction: '1000',
  paidBy: 'CASH',
  note: '',
  ...patch,
});

const run = (id: string, period: string, status: PayrollRunStatus) => ({ id, period, status });

describe('validateAdvanceForm', () => {
  it('accepts a valid advance', () => {
    expect(validateAdvanceForm(form(), TODAY)).toEqual({});
  });

  it('refuses a monthly deduction above the amount', () => {
    expect(validateAdvanceForm(form({ monthlyDeduction: '6000' }), TODAY).monthlyDeduction).toBe(
      'The monthly deduction cannot be more than the advance',
    );
    expect(validateAdvanceForm(form({ monthlyDeduction: '5000' }), TODAY)).toEqual({});
  });

  it('refuses a future date, a missing employee and bad amounts', () => {
    const e = validateAdvanceForm(
      form({ employeeId: '', date: '2026-10-16', amount: '0', monthlyDeduction: '1.234' }),
      TODAY,
    );
    expect(e.employeeId).toBeDefined();
    expect(e.date).toBe('An advance cannot be dated in the future');
    expect(e.amount).toBe('Enter an amount more than 0');
    expect(e.monthlyDeduction).toBe('Enter rupees and paise, like 1500 or 1500.50');
  });
});

describe('moneyError', () => {
  it('allows zero only when asked (advance override)', () => {
    expect(moneyError('0')).toBeDefined();
    expect(moneyError('0', { allowZero: true })).toBeUndefined();
    expect(moneyError('10000001')).toBe('This amount is too large');
  });
});

describe('adjustments', () => {
  it('validates items per row and builds the request', () => {
    const draft = {
      items: [
        { kind: 'BONUS' as const, note: ' Diwali ', amount: '500' },
        { kind: 'OTHER_DEDUCTION' as const, note: '', amount: '' },
      ],
      overrideAdvance: true,
      advanceOverride: '0',
    };
    expect(validateAdjustments(draft).items[1]?.amount).toBe('Enter an amount');
    draft.items[1].amount = '200';
    expect(validateAdjustments(draft)).toEqual({ items: {} });
    expect(adjustmentsToRequest(draft)).toEqual({
      manualItems: [
        { kind: 'BONUS', note: 'Diwali', amount: 500 },
        { kind: 'OTHER_DEDUCTION', note: null, amount: 200 },
      ],
      advanceOverride: 0,
    });
    expect(adjustmentsToRequest({ ...draft, overrideAdvance: false }).advanceOverride).toBeNull();
  });

  it('splits the advance out of total deductions without float noise', () => {
    const line = {
      totalDeductions: 1000.3,
      advanceRecoveries: [{ advanceId: 'a1', amount: 1000.1 }],
    } as PayrollLineResponse;
    expect(lineOtherDeductions(line)).toBe(0.2);
  });
});

describe('run order', () => {
  it('names the older month to finalise first', () => {
    const runs = [run('a', '2026-08', 'DRAFT'), run('b', '2026-09', 'DRAFT')];
    expect(finaliseOrderBlocker(runs[1], runs)).toBe(
      'Finalise August 2026 first. Months are finalised oldest first.',
    );
    expect(finaliseOrderBlocker(runs[0], runs)).toBeNull();
  });

  it('blocks finalising behind a later finalised month', () => {
    const runs = [run('a', '2026-08', 'DRAFT'), run('b', '2026-09', 'FINALISED')];
    expect(finaliseOrderBlocker(runs[0], runs)).toMatch(/September 2026 is already finalised/);
  });

  it('allows reopening only the newest finalised month', () => {
    const runs = [
      run('a', '2026-07', 'FINALISED'),
      run('b', '2026-08', 'FINALISED'),
      run('c', '2026-09', 'FINALISED'),
      run('d', '2026-10', 'DRAFT'),
    ];
    expect(reopenOrderBlocker(runs[2], runs)).toBeNull();
    expect(reopenOrderBlocker(runs[0], runs)).toBe(
      'Reopen September 2026 first. Months are reopened newest first.',
    );
  });
});
