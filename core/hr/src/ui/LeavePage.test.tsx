import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import type { LeaveRequestResponse } from '@inventory-platform/hr/types';
import { LeavePage } from '../pages/LeavePage';

const attendanceApi = vi.hoisted(() => ({ daily: vi.fn() }));
const leaveApi = vi.hoisted(() => ({
  list: vi.fn(),
  record: vi.fn(),
  preview: vi.fn(),
  decide: vi.fn(),
  balances: vi.fn(),
  balancesExport: vi.fn(),
}));
// Approvers get the HR inbox; keep its polls off the network.
const meApi = vi.hoisted(() => ({
  notifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
const download = vi.hoisted(() => ({ deliverHrFile: vi.fn() }));
vi.mock('../api/me.api', () => ({ meApi }));
vi.mock('../api/download', () => download);
const settingsApi = vi.hoisted(() => ({ listLeaveTypes: vi.fn(), getSettings: vi.fn() }));
vi.mock('../api/attendance.api', () => ({ attendanceApi }));
vi.mock('../api/leave.api', () => ({ leaveApi }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: settingsApi }));

const SHOP = 'shop-1';

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/leave', element: <LeavePage /> },
      { path: '/dashboard/hr/employees/:employeeId', element: <>Employee detail page</> },
    ],
    { initialEntries: ['/dashboard/hr/leave'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const PENDING: LeaveRequestResponse = {
  id: 'r1',
  employeeId: 'e1',
  employeeCode: 'EMP-001',
  employeeName: 'Asha',
  leaveTypeId: 't1',
  leaveTypeName: 'Casual',
  fromDate: '2025-10-06',
  toDate: '2025-10-07',
  halfDay: false,
  days: 2,
  reason: 'Wedding',
  status: 'PENDING',
  origin: 'SELF_SERVICE',
};

beforeEach(() => {
  leaveApi.list.mockResolvedValue({
    items: [PENDING],
    page: { page: 0, size: 20, totalItems: 1, totalPages: 1 },
  });
  leaveApi.decide.mockResolvedValue({ ...PENDING, status: 'APPROVED' });
  leaveApi.balances.mockResolvedValue([
    {
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
  ]);
  settingsApi.listLeaveTypes.mockResolvedValue([
    { id: 't1', name: 'Casual', paid: true, yearlyQuotaDays: 12, active: true },
  ]);
  settingsApi.getSettings.mockResolvedValue({ leaveYearStartMonth: 'JANUARY' });
  attendanceApi.daily.mockResolvedValue({ date: '2026-10-06', locked: false, rows: [] });
  meApi.notifications.mockResolvedValue({ items: [], cursor: null });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('LeavePage', () => {
  it('lists pending requests with dates like "Mon, 6 Oct" and the type name', async () => {
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE']);
    renderPage();
    expect(await screen.findByText('Mon, 6 Oct – Tue, 7 Oct')).toBeInTheDocument();
    // `leaveTypeName` comes with the request (run B4); no leave-type lookup any more.
    expect(await screen.findByText('Casual')).toBeInTheDocument();
    expect(settingsApi.listLeaveTypes).not.toHaveBeenCalled();
    expect(leaveApi.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  it('approves with an optional note', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE']);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Approve leave for Asha' }));
    await user.type(screen.getByLabelText('Note (optional)'), 'Enjoy');
    await user.click(screen.getByRole('button', { name: 'Approve leave' }));
    await waitFor(() =>
      expect(leaveApi.decide).toHaveBeenCalledWith('r1', 'approve', { note: 'Enjoy' }),
    );
  });

  it('rejects without a note and shows server errors in plain words', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE']);
    leaveApi.decide.mockRejectedValue(new Error('This leave request has already been decided'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Reject leave for Asha' }));
    await user.click(screen.getByRole('button', { name: 'Reject leave' }));
    await waitFor(() =>
      expect(leaveApi.decide).toHaveBeenCalledWith('r1', 'reject', { note: null }),
    );
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('This leave request has already been decided'),
    );
  });

  it('hides every action from view-only users', async () => {
    signIn(['VIEW_ATTENDANCE']);
    renderPage();
    expect(await screen.findByText('Wedding')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve leave for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reject leave for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel leave for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record leave' })).not.toBeInTheDocument();
  });

  it('lets MARK_ATTENDANCE cancel and record, but not approve', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderPage();
    expect(
      await screen.findByRole('button', { name: 'Cancel leave for Asha' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record leave' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve leave for/ })).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    renderPage();
    await screen.findByText('Wedding');
    await user.click(screen.getByRole('button', { name: 'Approved' }));
    await waitFor(() =>
      expect(leaveApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() =>
      expect(leaveApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
      ),
    );
  });

  it('shows balances per employee and leave type', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    expect(await screen.findByText('10 days')).toBeInTheDocument();
    expect(screen.getAllByText('No limit')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Leave year/ })).toBeInTheDocument();
  });

  it('downloads the balances of the shown leave year as Excel (run F5)', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    const file = { blob: new Blob(['x']), filename: 'leave-balances-2026.xlsx' };
    leaveApi.balancesExport.mockResolvedValue(file);
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    await screen.findByText('10 days');
    await user.click(screen.getByRole('button', { name: 'Download Excel' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(file, 'xlsx'));
    expect(leaveApi.balancesExport).toHaveBeenCalledWith('2026');
  });
});

describe('employee names (run F9)', () => {
  it('shows the employee as a link to the employee page for people who can see employees', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE', 'VIEW_EMPLOYEES']);
    renderPage();
    const link = await screen.findByRole('button', { name: 'Asha' });
    expect(link.className).toMatch(/linkButton/);
    await user.click(link);
    expect(await screen.findByText('Employee detail page')).toBeInTheDocument();
  });

  it('keeps the name as text without VIEW_EMPLOYEES', async () => {
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE']);
    renderPage();
    expect(await screen.findByText('Mon, 6 Oct – Tue, 7 Oct')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Asha' })).not.toBeInTheDocument();
  });
});
