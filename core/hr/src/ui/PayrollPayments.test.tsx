// Run F5 (task 20.2 rest): payments, undo, payslips, payslip email and the salary register on a
// finalised payroll run, and who sees which button.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  todayIso,
  type PayrollLineResponse,
  type PayrollRunResponse,
} from '@inventory-platform/hr/types';
import { PayrollRunPage } from '../pages/PayrollRunPage';

const payrollApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  pay: vi.fn(),
  undoPayment: vi.fn(),
  emailPayslips: vi.fn(),
  payslipPdf: vi.fn(),
  register: vi.fn(),
}));
const download = vi.hoisted(() => ({ deliverHrFile: vi.fn() }));
vi.mock('../api/payroll.api', () => ({ payrollApi }));
vi.mock('../api/download', () => download);

const SHOP = 'shop-1';
const OWNERISH: HrPermission[] = [
  'VIEW_EMPLOYEES',
  'VIEW_SALARIES',
  'RUN_PAYROLL',
  'RECORD_PAYMENTS',
];

function signIn(permissions: HrPermission[]) {
  useAuthStore.setState({ user: { shopId: SHOP, userId: 'u1' } } as never);
  useShopAccessStore.setState({
    byShopId: {
      [SHOP]: {
        owner: false,
        modules: { hr: true },
        hr: { permissions, employeeId: null },
      } as unknown as ShopAccess,
    },
  });
}

function renderRun() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/dashboard/hr/payroll/:runId', element: <PayrollRunPage /> }],
    { initialEntries: ['/dashboard/hr/payroll/run-sep'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function line(id: string, name: string, extra: Partial<PayrollLineResponse> = {}) {
  return {
    id,
    runId: 'run-sep',
    employeeId: `e-${id}`,
    period: '2026-09',
    employeeSnapshot: { name, code: `EMP-${id}` },
    earnings: [],
    deductions: [],
    manualItems: [],
    advanceRecoveries: [],
    gross: 12533,
    totalDeductions: 0,
    netBeforeRounding: 12533,
    rounding: 0,
    net: 12533,
    paymentStatus: 'PENDING',
    frozen: true,
    warnings: [],
    ...extra,
  } as PayrollLineResponse;
}

const ASHA = line('l1', 'Asha');
const RAVI = line('l2', 'Ravi');
const MEENA = line('l3', 'Meena', {
  paymentStatus: 'PAID',
  paidAt: '2026-10-03',
  paymentMethod: 'CASH',
});

const RUN: PayrollRunResponse = {
  id: 'run-sep',
  period: '2026-09',
  status: 'FINALISED',
  totals: {
    gross: 37599,
    deductions: 0,
    advanceRecovered: 0,
    rounding: 0,
    net: 37599,
    employeeCount: 3,
  },
  journalHistory: [],
  reopenHistory: [],
  lines: [ASHA, RAVI, MEENA],
};

beforeEach(() => {
  payrollApi.get.mockResolvedValue(RUN);
  payrollApi.list.mockResolvedValue([{ ...RUN, lines: null }]);
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('PayrollRunPage payments (run F5)', () => {
  it('shows Pending or Paid on <date> by <method> with ₹ in en-IN', async () => {
    signIn(OWNERISH);
    renderRun();
    const table = await screen.findByRole('table', { name: 'Pay for September 2026' });
    expect(within(table).getAllByText('Pending')).toHaveLength(2);
    expect(within(table).getByText('Paid on 3 Oct 2026 by Cash')).toBeInTheDocument();
    expect(within(table).getAllByText('₹12,533.00').length).toBeGreaterThan(0);
  });

  it('pays everyone in 50-line calls with progress, then names who was skipped', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    payrollApi.pay
      .mockResolvedValueOnce({
        paymentBatchId: 'b1',
        paid: 1,
        lines: [
          { lineId: 'l1', status: 'PAID' },
          { lineId: 'l2', status: 'IN_PROGRESS', error: 'Being paid by someone else' },
        ],
      })
      .mockResolvedValueOnce({ paid: 0, lines: [] });
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Pay everyone' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay everyone for September 2026' });
    expect(within(dialog).getByText(/2 employees are not paid yet/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'UPI' }));
    await user.type(within(dialog).getByLabelText('Reference (optional)'), 'UPI-77');
    await user.click(within(dialog).getByRole('button', { name: 'Pay everyone' }));

    expect(await within(dialog).findByText('Marked 1 employee as paid.')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Someone else is paying or undoing these right now: Ravi\./),
    ).toBeInTheDocument();
    expect(payrollApi.pay).toHaveBeenCalledTimes(2);
    expect(payrollApi.pay).toHaveBeenNthCalledWith(1, 'run-sep', {
      lineIds: [],
      all: true,
      date: todayIso(),
      method: 'UPI',
      reference: 'UPI-77',
    });
    // The run is read again after the loop.
    await waitFor(() => expect(payrollApi.get.mock.calls.length).toBeGreaterThan(1));
  });

  it('blocks a payment date before the month', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Mark Asha as paid' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark Asha as paid' });
    const date = within(dialog).getByLabelText('Date paid');
    expect(date).toHaveAttribute('min', '2026-09-01');
    expect(date).toHaveAttribute('max', todayIso());
    fireEvent.change(date, { target: { value: '2026-08-31' } });
    await user.click(within(dialog).getByRole('button', { name: 'Mark paid' }));
    expect(
      await within(dialog).findByText('The payment date cannot be before 1 Sep 2026.'),
    ).toBeInTheDocument();
    expect(payrollApi.pay).not.toHaveBeenCalled();
  });

  it('marks one employee paid with their line id', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    payrollApi.pay.mockResolvedValue({ paid: 1, lines: [{ lineId: 'l1', status: 'PAID' }] });
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Mark Asha as paid' }));
    const dialog = await screen.findByRole('dialog', { name: 'Mark Asha as paid' });
    await user.click(within(dialog).getByRole('button', { name: 'Mark paid' }));
    await waitFor(() =>
      expect(payrollApi.pay).toHaveBeenCalledWith('run-sep', {
        lineIds: ['l1'],
        date: todayIso(),
        method: 'CASH',
        reference: null,
      }),
    );
    expect(await within(dialog).findByText('Marked 1 employee as paid.')).toBeInTheDocument();
  });

  it('undoes one payment with an optional reason after a confirm', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    payrollApi.undoPayment.mockResolvedValue({ ...MEENA, paymentStatus: 'PENDING' });
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Undo payment to Meena' }));
    const dialog = await screen.findByRole('dialog', { name: 'Undo payment to Meena?' });
    expect(within(dialog).getByText(/Others paid at the same time stay paid/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Paid twice');
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    await waitFor(() =>
      expect(payrollApi.undoPayment).toHaveBeenCalledWith('run-sep', 'l3', 'Paid twice'),
    );
  });

  it('does not offer Reopen while a payment exists', async () => {
    signIn(OWNERISH);
    renderRun();
    expect(
      await screen.findByText('Undo the salary payments of September 2026 before reopening it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  });

  it('downloads a payslip from the table and from the drawer', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    const file = { blob: new Blob(['%PDF']), filename: 'payslip-EMP-l1.pdf' };
    payrollApi.payslipPdf.mockResolvedValue(file);
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Download payslip for Asha' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(file, 'pdf'));
    expect(payrollApi.payslipPdf).toHaveBeenCalledWith('run-sep', 'l1');

    await user.click(screen.getByRole('button', { name: 'Show pay details for Ravi' }));
    const drawer = await screen.findByRole('dialog', { name: 'Ravi' });
    await user.click(within(drawer).getByRole('button', { name: 'Download payslip' }));
    await waitFor(() => expect(payrollApi.payslipPdf).toHaveBeenCalledWith('run-sep', 'l2'));
  });

  it('emails payslips to the chosen employees and names who has no email', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    payrollApi.emailPayslips.mockResolvedValue({
      queued: 1,
      skippedNoEmail: [{ lineId: 'l3', employeeId: 'e-l3', code: 'EMP-l3', name: 'Meena' }],
    });
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Email payslips' }));
    const dialog = await screen.findByRole('dialog', { name: 'Email payslips for September 2026' });
    await user.click(within(dialog).getByLabelText('Ravi (EMP-l2)'));
    await user.click(within(dialog).getByRole('button', { name: 'Send 2 payslips' }));
    await waitFor(() =>
      expect(payrollApi.emailPayslips).toHaveBeenCalledWith('run-sep', { lineIds: ['l1', 'l3'] }),
    );
    expect(
      await within(dialog).findByText(
        /1 payslip is being emailed\. They go out over the next few minutes/,
      ),
    ).toBeInTheDocument();
    const missing = within(dialog).getByRole('list', {
      name: 'Employees without an email address',
    });
    expect(within(missing).getByText('Meena (EMP-l3)')).toBeInTheDocument();
  });

  it('downloads the salary register as Excel or PDF from a menu', async () => {
    const user = userEvent.setup();
    signIn(OWNERISH);
    const xlsx = { blob: new Blob(['x']), filename: 'register.xlsx' };
    const pdf = { blob: new Blob(['p']), filename: 'register.pdf' };
    payrollApi.register.mockImplementation(async (_r: string, f: string) =>
      f === 'pdf' ? pdf : xlsx,
    );
    renderRun();

    const trigger = await screen.findByRole('button', { name: 'Salary register' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Download Excel' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(xlsx, 'xlsx'));
    await user.click(screen.getByRole('button', { name: 'Salary register' }));
    await user.click(screen.getByRole('menuitem', { name: 'Open PDF' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(pdf, 'pdf'));
    expect(payrollApi.register.mock.calls).toEqual([
      ['run-sep', 'xlsx'],
      ['run-sep', 'pdf'],
    ]);
  });

  it('toasts the busy message from a register download and downloads again on request', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    const user = userEvent.setup();
    signIn(OWNERISH);
    payrollApi.register
      .mockRejectedValueOnce(new Error('Too many reports are being made right now. Try again'))
      .mockResolvedValue({ blob: new Blob(['x']), filename: 'r.xlsx' });
    renderRun();
    await user.click(await screen.findByRole('button', { name: 'Salary register' }));
    await user.click(screen.getByRole('menuitem', { name: 'Download Excel' }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        expect.stringMatching(/Too many reports are being made/),
      ),
    );
    // The toast has no retry button: choosing the download again repeats it.
    await user.click(screen.getByRole('button', { name: 'Salary register' }));
    await user.click(screen.getByRole('menuitem', { name: 'Download Excel' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledTimes(1));
  });
});

describe('PayrollRunPage permission hiding (run F5)', () => {
  it('has no pay or undo buttons without RECORD_PAYMENTS', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES', 'RUN_PAYROLL']);
    renderRun();
    await screen.findByRole('table', { name: 'Pay for September 2026' });
    expect(screen.queryByRole('button', { name: 'Pay everyone' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Mark .* as paid$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Undo payment/ })).toBeNull();
    // Payslips and email still work for a payroll runner.
    expect(screen.getByRole('button', { name: 'Download payslip for Asha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email payslips' })).toBeInTheDocument();
  });

  it('has no payslip or salary register without VIEW_SALARIES', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'RUN_PAYROLL']);
    renderRun();
    await screen.findByRole('table', { name: 'Pay for September 2026' });
    expect(screen.queryByRole('button', { name: /Download payslip/ })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Payslip' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salary register' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show pay details for Asha' }));
    const drawer = await screen.findByRole('dialog', { name: 'Asha' });
    expect(within(drawer).queryByRole('button', { name: 'Download payslip' })).toBeNull();
  });

  it('lets a RECORD_PAYMENTS-only user pay but not email or reopen', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES', 'RECORD_PAYMENTS']);
    renderRun();
    expect(await screen.findByRole('button', { name: 'Pay everyone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Asha as paid' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Email payslips' })).toBeNull();
    expect(screen.queryByText(/before reopening it/)).toBeNull();
  });

  it('shows no payment buttons on a draft', async () => {
    signIn(OWNERISH);
    payrollApi.get.mockResolvedValue({
      ...RUN,
      status: 'DRAFT',
      lines: [{ ...ASHA, frozen: false }],
    });
    renderRun();
    await screen.findByRole('table', { name: 'Pay for September 2026' });
    expect(screen.queryByRole('button', { name: 'Pay everyone' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salary register' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Email payslips' })).toBeNull();
  });
});
