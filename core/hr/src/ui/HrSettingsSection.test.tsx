import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  currentMonth,
  cycleRange,
  formatDateRange,
  type HrSettingsResponse,
} from '@inventory-platform/hr/types';
import { HrSettingsSection } from './HrSettingsSection';

const api = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getSetupStatus: vi.fn(),
  getRolePermissions: vi.fn(),
  updateRolePermissions: vi.fn(),
  listHolidays: vi.fn(),
  createHoliday: vi.fn(),
  updateHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
  listLeaveTypes: vi.fn(),
  createLeaveType: vi.fn(),
  updateLeaveType: vi.fn(),
}));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: api }));

const SHOP = 'shop-1';

const SETTINGS: HrSettingsResponse = {
  saved: true,
  currentWeeklyOffDays: ['SUNDAY'],
  workStart: '09:00',
  workEnd: '21:00',
  graceMinutes: 15,
  halfDayBelowHours: 4,
  overtimeEnabled: false,
  overtimeMultiplier: 1.5,
  perDayBasis: 'CALENDAR_DAYS',
  leaveYearStartMonth: 'JANUARY',
  revision: 2,
};

function signIn(permissions: HrPermission[], owner = false) {
  useAuthStore.setState({ user: { shopId: SHOP } } as never);
  useShopAccessStore.setState({
    byShopId: {
      [SHOP]: {
        owner,
        modules: { hr: true },
        hr: { permissions, employeeId: null },
      } as unknown as ShopAccess,
    },
  });
}

function renderSection(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (node: ReactNode) => (
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  );
  const router = createMemoryRouter([{ path: '/', element: wrap(<HrSettingsSection />) }]);
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  api.getSettings.mockResolvedValue(SETTINGS);
  api.listHolidays.mockResolvedValue([
    { id: 'h1', date: '2026-08-15', name: 'Independence Day', year: 2026 },
  ]);
  api.listLeaveTypes.mockResolvedValue([
    { id: 'l1', name: 'Casual', paid: true, yearlyQuotaDays: 12, active: true },
  ]);
  api.getRolePermissions.mockResolvedValue({
    roles: { ADMIN: [], MANAGER: [], CASHIER: [] },
    requires: {},
  });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('HrSettingsSection', () => {
  it('is read-only without MANAGE_SETTINGS and hides the owner grid', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderSection();

    expect(
      await screen.findByText(/You can see these settings but not change them/),
    ).toBeInTheDocument();
    expect(await screen.findByText('Independence Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Shop opens at')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sunday' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save working rules' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add holiday' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add leave type' })).not.toBeInTheDocument();
    expect(screen.queryByText('Who can do what in HR')).not.toBeInTheDocument();
    expect(api.getRolePermissions).not.toHaveBeenCalled();
  });

  it('lets a settings manager save a partial update with the revision', async () => {
    const user = userEvent.setup();
    signIn(['MANAGE_SETTINGS']);
    api.updateSettings.mockResolvedValue({ ...SETTINGS, graceMinutes: 20, revision: 3 });
    renderSection();

    const grace = await screen.findByLabelText('Late after (grace minutes)');
    await user.clear(grace);
    await user.type(grace, '20');
    await user.click(screen.getByRole('button', { name: 'Save working rules' }));

    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(1));
    const body = api.updateSettings.mock.calls[0][0];
    expect(body).toMatchObject({ graceMinutes: 20, revision: 2, weeklyOff: null });
  });

  it('sets the salary month start day with a live preview, 1 to 28 only', async () => {
    const user = userEvent.setup();
    signIn(['MANAGE_SETTINGS']);
    api.updateSettings.mockResolvedValue({ ...SETTINGS, payCycleStartDay: 26, revision: 3 });
    renderSection();

    const day = await screen.findByLabelText('Salary month starts on day');
    expect(day).toHaveValue('1');
    const calendar = cycleRange(currentMonth(), 1);
    expect(
      screen.getByText(`This month's salary: ${formatDateRange(calendar.from, calendar.to)}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start one day earlier' })).toBeDisabled();

    await user.clear(day);
    await user.type(day, '29');
    expect(screen.getByText('Enter a day from 1 to 28.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save working rules' }));
    expect(
      screen.getByText('Salary month start day must be a whole number from 1 to 28'),
    ).toBeInTheDocument();
    expect(api.updateSettings).not.toHaveBeenCalled();

    await user.clear(day);
    await user.type(day, '25');
    await user.click(screen.getByRole('button', { name: 'Start one day later' }));
    expect(day).toHaveValue('26');
    const cycle = cycleRange(currentMonth(), 26);
    expect(
      screen.getByText(`This month's salary: ${formatDateRange(cycle.from, cycle.to)}`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save working rules' }));
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(1));
    expect(api.updateSettings.mock.calls[0][0]).toMatchObject({ payCycleStartDay: 26 });
  });

  it('shows the server refusal to change the start day as sent', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    const user = userEvent.setup();
    signIn(['MANAGE_SETTINGS']);
    const sent = 'The salary month start can be changed only before any payroll is finalised.';
    api.updateSettings.mockRejectedValue(new Error(sent));
    renderSection();

    const day = await screen.findByLabelText('Salary month starts on day');
    await user.clear(day);
    await user.type(day, '26');
    await user.click(screen.getByRole('button', { name: 'Save working rules' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(sent));
  });

  it('warns before the leave year start changes', async () => {
    const user = userEvent.setup();
    signIn(['MANAGE_SETTINGS']);
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'April' }));
    expect(screen.getByText(/moves every employee's leave balance/)).toBeInTheDocument();
  });

  it('shows the role grid to the owner', async () => {
    signIn(['MANAGE_SETTINGS'], true);
    renderSection();
    expect(await screen.findByText('Who can do what in HR')).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'Run payroll, Admin' })).toBeInTheDocument();
  });
});
