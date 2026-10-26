import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { ApiError } from '@inventory-platform/api-client';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import {
  currentMonth,
  type PayrollLineResponse,
  type PayrollRunResponse,
} from '@inventory-platform/hr/types';
import { PayrollListPage } from '../pages/PayrollListPage';
import { PayrollRunPage } from '../pages/PayrollRunPage';

const payrollApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  recalculate: vi.fn(),
  saveAdjustments: vi.fn(),
  unmarked: vi.fn(),
  finalise: vi.fn(),
  reopen: vi.fn(),
}));
const attendanceApi = vi.hoisted(() => ({ markUnmarkedPresent: vi.fn() }));
vi.mock('../api/payroll.api', () => ({ payrollApi }));
vi.mock('../api/attendance.api', () => ({ attendanceApi }));

const SHOP = 'shop-1';
const RUNNER: HrPermission[] = [
  'VIEW_EMPLOYEES',
  'VIEW_SALARIES',
  'VIEW_ATTENDANCE',
  'MARK_ATTENDANCE',
  'RUN_PAYROLL',
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

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/payroll', element: <PayrollListPage /> },
      { path: '/dashboard/hr/payroll/:runId', element: <PayrollRunPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const LINE: PayrollLineResponse = {
  id: 'l1',
  runId: 'run-sep',
  employeeId: 'e1',
  period: '2026-09',
  employeeSnapshot: { name: 'Asha', code: 'EMP-001', payType: 'MONTHLY', rateAmount: 14500 },
  dayCounts: { employedDays: 30, present: 26, paidDays: 28, basisDays: 30 },
  earnings: [{ kind: 'BASE', label: 'Base pay', amount: 13533.33 }],
  deductions: [{ kind: 'ADVANCE', label: 'Advance recovery', amount: 1000 }],
  manualItems: [],
  advanceOverride: null,
  advanceRecoveries: [{ advanceId: 'a1', amount: 1000 }],
  advanceOutstandingAfter: 4000,
  gross: 13533.33,
  totalDeductions: 1000,
  netBeforeRounding: 12533.33,
  rounding: -0.33,
  net: 12533,
  paymentStatus: null,
  frozen: false,
  warnings: ['NO_SALARY'],
  updatedAt: '2026-10-01T10:00:00Z',
};

const DRAFT: PayrollRunResponse = {
  id: 'run-sep',
  period: '2026-09',
  status: 'DRAFT',
  revision: 0,
  totals: {
    gross: 13533.33,
    deductions: 1000,
    advanceRecovered: 1000,
    rounding: -0.33,
    net: 12533,
    employeeCount: 1,
  },
  journalHistory: [],
  reopenHistory: [],
  lines: [LINE],
};
const FINALISED: PayrollRunResponse = {
  ...DRAFT,
  status: 'FINALISED',
  lines: [{ ...LINE, frozen: true }],
};

beforeEach(() => {
  payrollApi.list.mockResolvedValue([{ ...DRAFT, lines: null }]);
  payrollApi.get.mockResolvedValue(DRAFT);
  payrollApi.unmarked.mockResolvedValue({ period: '2026-09', employees: [] });
  payrollApi.finalise.mockResolvedValue(FINALISED);
  payrollApi.reopen.mockResolvedValue(DRAFT);
  payrollApi.recalculate.mockResolvedValue(DRAFT);
  payrollApi.saveAdjustments.mockImplementation(async (_r, _l, body) => ({
    ...LINE,
    manualItems: body.manualItems,
    updatedAt: '2026-10-01T11:00:00Z',
  }));
  attendanceApi.markUnmarkedPresent.mockResolvedValue({ marked: 2 });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('PayrollListPage', () => {
  it('starts payroll for the chosen month and opens it', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    payrollApi.list.mockResolvedValue([]);
    payrollApi.create.mockResolvedValue({ ...DRAFT, id: 'run-new', period: currentMonth() });
    const router = renderAt('/dashboard/hr/payroll');

    await user.click(await screen.findByRole('button', { name: /^Start payroll for / }));
    await waitFor(() => expect(payrollApi.create).toHaveBeenCalledWith(currentMonth()));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboard/hr/payroll/run-new'),
    );
  });

  it('lists runs with status and totals and says which month to finalise first', async () => {
    signIn(RUNNER);
    payrollApi.list.mockResolvedValue([
      { ...DRAFT, id: 'run-aug', period: '2026-08', lines: null },
      { ...DRAFT, lines: null },
    ]);
    renderAt('/dashboard/hr/payroll');
    expect(
      await screen.findByText('Finalise August 2026 first. Months are finalised oldest first.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Draft')).toHaveLength(2);
    expect(screen.getAllByText('₹12,533.00')).toHaveLength(2);
    expect(screen.getByText(/Months are finalised oldest first\. To change/)).toBeInTheDocument();
  });

  it('has no start button without RUN_PAYROLL', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES', 'RECORD_PAYMENTS']);
    payrollApi.list.mockResolvedValue([]);
    renderAt('/dashboard/hr/payroll');
    expect(await screen.findByText(/No payroll yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start payroll/ })).toBeNull();
  });
});

describe('PayrollRunPage', () => {
  it('shows totals and lines with warnings as plain text', async () => {
    signIn(RUNNER);
    renderAt('/dashboard/hr/payroll/run-sep');
    expect(
      await screen.findByRole('heading', { name: 'Payroll for September 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show pay details for Asha' })).toBeInTheDocument();
    expect(screen.getByText('No salary set')).toBeInTheDocument();
    expect(screen.getAllByText('₹12,533.00').length).toBeGreaterThan(0);
  });

  it('labels advance amounts as recovered this month, not taken', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    renderAt('/dashboard/hr/payroll/run-sep');
    // Stat block and the lines table column.
    expect(await screen.findAllByText('Advance recovered')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Advance recovered' })).toBeInTheDocument();
    expect(screen.queryByText(/Advances? taken/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show pay details for Asha' }));
    const drawer = await screen.findByRole('dialog', { name: 'Asha' });
    expect(within(drawer).getByText(/Advance recovered this month: ₹1,000.00/)).toBeInTheDocument();
    expect(within(drawer).queryByText(/Advance taken/)).toBeNull();
  });

  it('finalises after a confirm that explains the attendance lock', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Finalise' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/Attendance for September 2026 gets locked/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Finalise payroll' }));
    await waitFor(() => expect(payrollApi.finalise).toHaveBeenCalledWith('run-sep'));
    expect(payrollApi.unmarked).toHaveBeenCalledWith('run-sep');
  });

  it('lists unmarked days, marks them Present, then finalises', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    payrollApi.unmarked
      .mockResolvedValueOnce({
        period: '2026-09',
        employees: [
          { employeeId: 'e1', code: 'EMP-001', name: 'Asha', dates: ['2026-09-03', '2026-09-04'] },
          { employeeId: 'e2', code: 'EMP-002', name: 'Ravi', dates: ['2026-09-04'] },
        ],
      })
      .mockResolvedValue({ period: '2026-09', employees: [] });
    renderAt('/dashboard/hr/payroll/run-sep');

    await user.click(await screen.findByRole('button', { name: 'Finalise' }));
    const list = await screen.findByRole('list', { name: 'Unmarked days' });
    expect(within(list).getByText('Thu, 3 Sep, Fri, 4 Sep')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark them all Present' }));
    await waitFor(() =>
      expect(attendanceApi.markUnmarkedPresent).toHaveBeenCalledWith({
        dates: ['2026-09-03', '2026-09-04'],
        employeeIds: ['e1', 'e2'],
      }),
    );
    const confirm = await screen.findByRole('dialog', { name: /Finalise payroll for September/ });
    await user.click(within(confirm).getByRole('button', { name: 'Finalise payroll' }));
    await waitFor(() => expect(payrollApi.finalise).toHaveBeenCalledWith('run-sep'));
  });

  it('offers every listed day for marking: the server leaves out days after today (run F8)', async () => {
    // Today is 3 Sep in the browser; 4 Sep is still listed, so it is sent as listed (the server
    // only lists days that can be marked since run B6).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 3, 12, 0));
    try {
      const user = userEvent.setup();
      signIn(RUNNER);
      payrollApi.unmarked.mockResolvedValueOnce({
        period: '2026-09',
        employees: [
          { employeeId: 'e1', code: 'EMP-001', name: 'Asha', dates: ['2026-09-03', '2026-09-04'] },
        ],
      });
      renderAt('/dashboard/hr/payroll/run-sep');

      await user.click(await screen.findByRole('button', { name: 'Finalise' }));
      await screen.findByRole('list', { name: 'Unmarked days' });
      expect(screen.queryByText(/after today/)).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Mark them all Present' }));
      await waitFor(() =>
        expect(attendanceApi.markUnmarkedPresent).toHaveBeenCalledWith({
          dates: ['2026-09-03', '2026-09-04'],
          employeeIds: ['e1'],
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows "this month is not over yet" as sent, not as the unmarked list (run F8)', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    const sent = 'This month is not over yet. Payroll for 2026-09 can be finalised from 2026-10-01';
    payrollApi.finalise.mockRejectedValue(new ApiError(sent, { status: 400 }));
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Finalise' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalise payroll' }),
    );
    expect(await screen.findByText(sent)).toBeInTheDocument();
    expect(screen.queryByText('Could not finalise this payroll')).toBeNull();
    // Not the 422 flow: the unmarked list is not fetched again or shown.
    expect(payrollApi.unmarked).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('list', { name: 'Unmarked days' })).toBeNull();
  });

  it('says plainly when payroll went back to draft while finalising and refreshes', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    payrollApi.finalise.mockRejectedValue(
      new ApiError(
        'Payroll changed while it was being finalised, so it is back to draft. Check it and finalise again',
        { status: 409 },
      ),
    );
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Finalise' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalise payroll' }),
    );
    expect(await screen.findByText(/so it is back to draft/)).toBeInTheDocument();
    // The run is read again so the page shows the new draft.
    await waitFor(() => expect(payrollApi.get.mock.calls.length).toBeGreaterThan(1));
  });

  it('reopens only with a reason and explains the order rule', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    payrollApi.get.mockResolvedValue(FINALISED);
    payrollApi.list.mockResolvedValue([{ ...FINALISED, lines: null }]);
    renderAt('/dashboard/hr/payroll/run-sep');

    await user.click(await screen.findByRole('button', { name: 'Reopen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Months are reopened newest first/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reopen payroll' }));
    expect(
      await within(dialog).findByText('Please give a reason for reopening this month'),
    ).toBeInTheDocument();
    expect(payrollApi.reopen).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText('Reason'), 'Wrong overtime');
    await user.click(within(dialog).getByRole('button', { name: 'Reopen payroll' }));
    await waitFor(() =>
      expect(payrollApi.reopen).toHaveBeenCalledWith('run-sep', 'Wrong overtime'),
    );
  });

  it('hides Reopen on an older finalised month and names the one to reopen', async () => {
    signIn(RUNNER);
    payrollApi.get.mockResolvedValue(FINALISED);
    payrollApi.list.mockResolvedValue([
      { ...FINALISED, lines: null },
      { ...FINALISED, id: 'run-oct', period: '2026-10', lines: null },
    ]);
    renderAt('/dashboard/hr/payroll/run-sep');
    expect(
      await screen.findByText('Reopen October 2026 first. Months are reopened newest first.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  });

  it('shows the account conflict message as sent when finalise is refused', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    const sent =
      'Account 2400 in your chart of accounts is not the HR one. Rename or move it, then finalise again';
    payrollApi.finalise.mockRejectedValue(new ApiError(sent, { status: 409 }));
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Finalise' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Finalise payroll' }),
    );
    expect(await screen.findByText(sent)).toBeInTheDocument();
    expect(screen.queryByText('Could not finalise this payroll')).toBeNull();
  });

  it('shows half a day of off-day work and paid days above days employed', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    payrollApi.get.mockResolvedValue({
      ...DRAFT,
      lines: [
        {
          ...LINE,
          dayCounts: { employedDays: 30, present: 30, offDayWorked: 0.5, paidDays: 31.5 },
        },
      ],
    });
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Show pay details for Asha' }));
    const drawer = await screen.findByRole('dialog', { name: 'Asha' });
    const row = within(drawer).getByText('Work on off days').parentElement as HTMLElement;
    expect(within(row).getByText('0.5 days')).toBeInTheDocument();
    expect(within(drawer).getByText('31.5')).toBeInTheDocument();
  });

  it('saves a bonus from the line drawer', async () => {
    const user = userEvent.setup();
    signIn(RUNNER);
    renderAt('/dashboard/hr/payroll/run-sep');
    await user.click(await screen.findByRole('button', { name: 'Show pay details for Asha' }));
    const drawer = await screen.findByRole('dialog', { name: 'Asha' });
    expect(within(drawer).getByText('Base pay')).toBeInTheDocument();
    expect(within(drawer).getByText(/Still owed after this month: ₹4,000.00/)).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Add bonus or deduction' }));
    await user.type(within(drawer).getByLabelText('Note for item 1'), 'Diwali');
    await user.type(within(drawer).getByLabelText('Amount for item 1 (₹)'), '500');
    await user.click(within(drawer).getByLabelText("Change this month's advance deduction"));
    await user.clear(within(drawer).getByLabelText('Advance deduction this month (₹)'));
    await user.type(within(drawer).getByLabelText('Advance deduction this month (₹)'), '0');
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(payrollApi.saveAdjustments).toHaveBeenCalledWith('run-sep', 'l1', {
        manualItems: [{ kind: 'BONUS', note: 'Diwali', amount: 500 }],
        advanceOverride: 0,
      }),
    );
  });

  it('is read-only with only RECORD_PAYMENTS', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES', 'RECORD_PAYMENTS']);
    renderAt('/dashboard/hr/payroll/run-sep');
    expect(await screen.findByText(/You can see this payroll/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finalise' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recalculate' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show pay details for Asha' }));
    const drawer = await screen.findByRole('dialog', { name: 'Asha' });
    expect(within(drawer).queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});
