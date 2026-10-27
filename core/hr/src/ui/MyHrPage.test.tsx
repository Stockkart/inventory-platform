// Run F5 (task 21): My HR shows the signed-in employee's own data only, from `/hr/me/**`.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  currentMonth,
  type LeaveRequestResponse,
  type MonthRegisterResponse,
} from '@inventory-platform/hr/types';
import { MyHrPage } from '../pages/MyHrPage';

const meApi = vi.hoisted(() => ({
  profile: vi.fn(),
  attendance: vi.fn(),
  leave: vi.fn(),
  previewLeave: vi.fn(),
  requestLeave: vi.fn(),
  cancelLeave: vi.fn(),
  payslips: vi.fn(),
  payslipPdf: vi.fn(),
  notifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  checkInStatus: vi.fn(),
  checkIn: vi.fn(),
  punches: vi.fn(),
}));
// Staff APIs: My HR must never call them (they would show other employees).
const staff = vi.hoisted(() => ({
  employees: { list: vi.fn(), get: vi.fn() },
  attendance: { daily: vi.fn(), month: vi.fn(), history: vi.fn() },
  leave: { list: vi.fn(), balances: vi.fn(), preview: vi.fn(), record: vi.fn() },
  payroll: { list: vi.fn(), get: vi.fn(), payslipPdf: vi.fn() },
}));
const download = vi.hoisted(() => ({ deliverHrFile: vi.fn() }));
vi.mock('../api/me.api', () => ({ meApi }));
vi.mock('../api/employees.api', () => ({ employeesApi: staff.employees }));
vi.mock('../api/attendance.api', () => ({ attendanceApi: staff.attendance }));
vi.mock('../api/leave.api', () => ({ leaveApi: staff.leave }));
vi.mock('../api/payroll.api', () => ({ payrollApi: staff.payroll }));
vi.mock('../api/download', () => download);

const SHOP = 'shop-1';

function signIn(employeeId: string | null, permissions: HrPermission[] = []) {
  useAuthStore.setState({ user: { shopId: SHOP, userId: 'u1' } } as never);
  useShopAccessStore.setState({
    byShopId: {
      [SHOP]: {
        owner: false,
        modules: { hr: true },
        hr: { permissions, employeeId },
      } as unknown as ShopAccess,
    },
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/dashboard/hr/me', element: <MyHrPage /> }], {
    initialEntries: ['/dashboard/hr/me'],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const THIS_MONTH = currentMonth();
const MONTH: MonthRegisterResponse = {
  period: THIS_MONTH,
  locked: false,
  dates: [`${THIS_MONTH}-01`],
  rows: [
    {
      employeeId: 'e1',
      code: 'EMP-001',
      name: 'Asha',
      cells: [{ status: 'PRESENT', late: true }],
      totals: {
        present: 1,
        halfDays: 0,
        absent: 0,
        leave: 0,
        weekOff: 0,
        holiday: 0,
        unmarked: 0,
        lateDays: 1,
        workedMinutes: 0,
        overtimeMinutes: 0,
      },
    },
  ],
};

function request(id: string, extra: Partial<LeaveRequestResponse>): LeaveRequestResponse {
  return {
    id,
    employeeId: 'e1',
    leaveTypeId: 't1',
    leaveTypeName: 'Casual',
    fromDate: '2026-11-03',
    toDate: '2026-11-03',
    halfDay: false,
    days: 1,
    status: 'PENDING',
    origin: 'SELF_SERVICE',
    ...extra,
  };
}

const CHECK_IN_OFF = {
  enabled: false,
  locationRequired: false,
  canCheckIn: false,
  nextDirection: 'IN',
  punchCount: 0,
  missingCheckOut: false,
};

beforeEach(() => {
  meApi.checkInStatus.mockResolvedValue(CHECK_IN_OFF);
  meApi.profile.mockResolvedValue({
    id: 'e1',
    code: 'EMP-001',
    name: 'Asha',
    designation: 'Cashier',
    status: 'ACTIVE',
    payType: 'MONTHLY',
    salaryAmount: 14500,
    paymentMethod: 'BANK',
    bankAccountNumber: 'XXXXXX1234',
    ifsc: 'SBIN0001234',
    payHidden: false,
  });
  meApi.attendance.mockResolvedValue(MONTH);
  meApi.leave.mockResolvedValue({
    balances: {
      employeeId: 'e1',
      code: 'EMP-001',
      name: 'Asha',
      leaveYear: '2026',
      balances: [
        {
          leaveTypeId: 't1',
          leaveTypeName: 'Casual',
          paid: true,
          quota: 12,
          used: 2,
          available: 10,
        },
        { leaveTypeId: 't3', leaveTypeName: 'Unpaid leave', paid: false, used: 0 },
      ],
    },
    requests: [
      request('r1', {}),
      // September payroll is finalised (there is a payslip), so this one cannot be cancelled.
      request('r2', { status: 'APPROVED', fromDate: '2026-09-10', toDate: '2026-09-11', days: 2 }),
      request('r3', { status: 'REJECTED', fromDate: '2026-11-20', toDate: '2026-11-20' }),
    ],
  });
  meApi.payslips.mockResolvedValue([
    {
      lineId: 'l9',
      runId: 'run-sep',
      period: '2026-09',
      net: 12533,
      paymentStatus: 'PAID',
      paidAt: '2026-10-03',
    },
  ]);
  meApi.previewLeave.mockResolvedValue({
    days: 1,
    paid: true,
    available: 10,
    exceedsBalance: false,
    leaveYear: '2026',
  });
  meApi.requestLeave.mockImplementation(async (body) => ({ ...request('r9', {}), ...body }));
  meApi.cancelLeave.mockResolvedValue(request('r1', { status: 'CANCELLED' }));
  meApi.notifications.mockResolvedValue({ items: [], cursor: null });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

function expectNoStaffCalls() {
  for (const api of Object.values(staff)) {
    for (const fn of Object.values(api)) expect(fn).not.toHaveBeenCalled();
  }
}

describe('MyHrPage', () => {
  it('shows own profile, attendance, leave and payslips from /me only', async () => {
    signIn('e1');
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Asha' })).toBeInTheDocument();
    expect(screen.getByText('Pay: ₹14,500.00 a month')).toBeInTheDocument();
    // Bank details as the server masked them.
    expect(screen.getByText(/XXXXXX1234/)).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: /^My attendance, / })).toBeInTheDocument();
    expect(screen.getByText(/Present 1 · Half-days 0/)).toBeInTheDocument();
    expect(await screen.findByText('10 days')).toBeInTheDocument();
    const payslips = await screen.findByRole('table', { name: 'My payslips' });
    expect(within(payslips).getByText('September 2026 · 1 Sep – 30 Sep')).toBeInTheDocument();
    expect(within(payslips).getByText('₹12,533.00')).toBeInTheDocument();
    expect(within(payslips).getByText('Paid on 3 Oct 2026')).toBeInTheDocument();

    expect(meApi.attendance).toHaveBeenCalledWith(THIS_MONTH);
    expectNoStaffCalls();
  });

  it('offers Cancel only on own pending/approved requests in open months', async () => {
    const user = userEvent.setup();
    signIn('e1');
    renderPage();
    const requests = await screen.findByRole('table', { name: 'Leave requests' });
    await within(requests).findByText('Tue, 3 Nov');
    const cancels = within(requests).getAllByRole('button', { name: /^Cancel leave on / });
    expect(cancels).toHaveLength(1);
    expect(cancels[0]).toHaveAccessibleName('Cancel leave on Tue, 3 Nov');
    // No approve/reject in self-service.
    expect(within(requests).queryByRole('button', { name: /Approve/ })).toBeNull();

    await user.click(cancels[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this leave?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel leave' }));
    await waitFor(() => expect(meApi.cancelLeave).toHaveBeenCalledWith('r1'));
  });

  it('downloads own payslip', async () => {
    const user = userEvent.setup();
    signIn('e1');
    const file = { blob: new Blob(['%PDF']), filename: 'payslip.pdf' };
    meApi.payslipPdf.mockResolvedValue(file);
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Download payslip for September 2026' }),
    );
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(file, 'pdf'));
    expect(meApi.payslipPdf).toHaveBeenCalledWith('l9');
    expectNoStaffCalls();
  });

  it('asks for leave with a preview of the days', async () => {
    const user = userEvent.setup();
    signIn('e1');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ask for leave' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ask for leave' });
    await user.click(within(dialog).getByRole('button', { name: /Leave type/ }));
    await user.click(await screen.findByRole('option', { name: /Casual/ }));
    expect(await within(dialog).findByText(/10 days left before this/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Family');
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(meApi.requestLeave).toHaveBeenCalledTimes(1));
    const body = meApi.requestLeave.mock.calls[0][0];
    // No employee id: the server always uses the caller.
    expect(body).toEqual({
      leaveTypeId: 't1',
      fromDate: body.fromDate,
      toDate: body.fromDate,
      halfDay: null,
      reason: 'Family',
    });
    expect(meApi.previewLeave).toHaveBeenCalledWith(
      expect.objectContaining({ leaveTypeId: 't1', halfDay: false }),
    );
  });

  it('stops a paid request over the balance and suggests unpaid leave', async () => {
    const user = userEvent.setup();
    signIn('e1');
    meApi.previewLeave.mockResolvedValue({
      days: 12,
      paid: true,
      available: 10,
      exceedsBalance: true,
      leaveYear: '2026',
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ask for leave' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ask for leave' });
    await user.click(within(dialog).getByRole('button', { name: /Leave type/ }));
    await user.click(await screen.findByRole('option', { name: /Casual/ }));
    expect(
      await within(dialog).findByText(/more than your balance left\. Choose an unpaid leave type/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(meApi.requestLeave).not.toHaveBeenCalled();
  });

  it('explains My HR to members who are not linked and loads nothing', async () => {
    signIn(null, ['VIEW_ATTENDANCE']);
    renderPage();
    expect(await screen.findByText(/linked to an employee/)).toBeInTheDocument();
    expect(meApi.profile).not.toHaveBeenCalled();
    expect(meApi.payslips).not.toHaveBeenCalled();
    expectNoStaffCalls();
  });
});

describe('MyHrPage check-in', () => {
  const ON = { ...CHECK_IN_OFF, enabled: true, canCheckIn: true };

  function mockGeolocation(impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn(impl) },
    });
  }

  it('checks in, then offers Check out with both times', async () => {
    signIn('e1', ['SELF_CHECK_IN']);
    meApi.checkInStatus.mockResolvedValueOnce(ON).mockResolvedValue({
      ...ON,
      todayIn: '09:12',
      nextDirection: 'OUT',
      punchCount: 1,
    });
    meApi.checkIn
      .mockResolvedValueOnce({ ...ON, todayIn: '09:12', nextDirection: 'OUT', punchCount: 1 })
      .mockResolvedValueOnce({
        ...ON,
        todayIn: '09:12',
        todayOut: '18:40',
        nextDirection: 'OUT',
        punchCount: 2,
      });
    renderPage();

    expect(await screen.findByText('Not checked in today')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check in' }));
    expect(meApi.checkIn).toHaveBeenCalledWith({});
    expect(await screen.findByRole('button', { name: 'Check out' })).toBeInTheDocument();
    expect(screen.getByText('Checked in at 09:12')).toBeInTheDocument();

    meApi.checkInStatus.mockResolvedValue({
      ...ON,
      todayIn: '09:12',
      todayOut: '18:40',
      nextDirection: 'OUT',
      punchCount: 2,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Check out' }));
    expect(
      await screen.findByText('Checked in at 09:12 · Checked out at 18:40'),
    ).toBeInTheDocument();
  });

  it('sends the location when the shop checks it', async () => {
    signIn('e1', ['SELF_CHECK_IN']);
    mockGeolocation((ok) =>
      ok({ coords: { latitude: 12.9, longitude: 77.6, accuracy: 18 } } as GeolocationPosition),
    );
    meApi.checkInStatus.mockResolvedValue({ ...ON, locationRequired: true });
    meApi.checkIn.mockResolvedValue({ ...ON, todayIn: '09:12', nextDirection: 'OUT' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    await waitFor(() =>
      expect(meApi.checkIn).toHaveBeenCalledWith({ lat: 12.9, lng: 77.6, accuracy: 18 }),
    );
  });

  it('still asks the server when the location is denied, and shows its answer', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    signIn('e1', ['SELF_CHECK_IN']);
    mockGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));
    meApi.checkInStatus.mockResolvedValue({ ...ON, locationRequired: true });
    meApi.checkIn.mockRejectedValue(new Error("You're not at the shop"));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    await waitFor(() => expect(meApi.checkIn).toHaveBeenCalledWith({}));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("You're not at the shop"));
    expect(screen.getByText(/Location is blocked for this site/)).toBeInTheDocument();
  });

  it('shows the reason instead of the button, and the missing check-out chip', async () => {
    signIn('e1', ['SELF_CHECK_IN']);
    meApi.checkInStatus.mockResolvedValue({
      ...ON,
      canCheckIn: false,
      reason: 'You are on leave today',
      missingCheckOut: true,
    });
    renderPage();

    expect(await screen.findByText('You are on leave today')).toBeInTheDocument();
    expect(screen.getByText('Missing check-out')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull();
  });

  it('hides the card when self check-in is off', async () => {
    signIn('e1', ['SELF_CHECK_IN']);
    renderPage();
    expect(await screen.findByText('My attendance')).toBeInTheDocument();
    await waitFor(() => expect(meApi.checkInStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull();
    expect(screen.queryByText('Today')).toBeNull();
  });
});
