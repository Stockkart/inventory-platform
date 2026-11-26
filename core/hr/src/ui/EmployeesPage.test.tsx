// HR-module task 10.7: the "App paired" column and filter (R8.12, R1.9) and the Attendance app
// health banner on the HR landing (R10.5).
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import type { AppHealthAlert, EmployeeResponse } from '@inventory-platform/hr/types';
import { EmployeesPage } from '../pages/EmployeesPage';
import { appHealthAlertText, formatFailureRate } from './AppHealthBanner';

const employeesApi = vi.hoisted(() => ({
  list: vi.fn(),
  designations: vi.fn(),
  linkableLogins: vi.fn(),
}));
const settingsApi = vi.hoisted(() => ({ getSetupStatus: vi.fn() }));
const pairingApi = vi.hoisted(() => ({ health: vi.fn() }));
const joinRequestsApi = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));
// The bell polls for ADD_EDIT_EMPLOYEES since the Join requests inbox (worker-app R10.5).
const meApi = vi.hoisted(() => ({ notifications: vi.fn() }));
vi.mock('../api/employees.api', () => ({ employeesApi }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: settingsApi }));
vi.mock('../api/pairing.api', () => ({ pairingApi }));
vi.mock('../api/join-requests.api', () => ({ joinRequestsApi }));
vi.mock('../api/me.api', () => ({ meApi }));

const SHOP = 'shop-1';

function signIn(permissions: HrPermission[]) {
  useAuthStore.setState({
    user: {
      shopId: SHOP,
      userId: 'u1',
      shops: [{ shopId: SHOP, shopName: 'Main Street Stores' }],
    },
  } as never);
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
    [{ path: '/dashboard/hr/employees', element: <EmployeesPage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function employee(over: Partial<EmployeeResponse> & Pick<EmployeeResponse, 'id' | 'name'>) {
  return {
    code: `EMP-${over.id}`,
    status: 'ACTIVE',
    joinDate: '2026-01-05',
    payType: 'MONTHLY',
    salaryAmount: 10000,
    salaryRevisions: [],
    paymentMethod: 'CASH',
    payHidden: false,
    ...over,
  } as EmployeeResponse;
}

const RAVI = employee({ id: 'e1', name: 'Ravi Kumar', appPaired: true });
const SITA = employee({ id: 'e2', name: 'Sita Devi', appPaired: false });
const OLD = employee({ id: 'e3', name: 'Mohan Lal' });

const page = (items: EmployeeResponse[]) => ({
  items,
  page: { page: 0, size: 20, totalItems: items.length, totalPages: 1 },
});

const ALERT: AppHealthAlert = {
  shopId: SHOP,
  rate: 0.0625,
  failed: 2,
  attempts: 32,
  raisedAt: '2026-04-03T09:12:00Z',
};

beforeEach(() => {
  employeesApi.list.mockResolvedValue(page([RAVI, SITA, OLD]));
  employeesApi.designations.mockResolvedValue(['Helper']);
  employeesApi.linkableLogins.mockResolvedValue([]);
  pairingApi.health.mockResolvedValue({ alerts: [] });
  joinRequestsApi.list.mockResolvedValue({ items: [], pendingCount: 2, page: 0 });
  meApi.notifications.mockResolvedValue({ items: [], cursor: null });
  settingsApi.getSetupStatus.mockResolvedValue({
    settingsSaved: true,
    employeeCount: 3,
    attendanceMarked: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

function rowOf(name: string) {
  return screen.getByRole('button', { name }).closest('tr') as HTMLTableRowElement;
}

describe('EmployeesPage — App paired column (R8.12)', () => {
  it('shows Yes / No per employee and a dash when the backend did not say', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });

    expect(screen.getByRole('columnheader', { name: 'App paired' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    const col = headers.indexOf('App paired');
    expect(within(rowOf('Ravi Kumar')).getAllByRole('cell')[col]).toHaveTextContent('Yes');
    expect(within(rowOf('Sita Devi')).getAllByRole('cell')[col]).toHaveTextContent('No');
    expect(within(rowOf('Mohan Lal')).getAllByRole('cell')[col]).toHaveTextContent('—');
  });
});

describe('EmployeesPage — App paired filter (R8.12, R1.9)', () => {
  it('sends no paired param by default and sends true / false for Paired / Not paired', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES']);
    const router = renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    expect(employeesApi.list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ paired: expect.anything() }),
    );

    await user.click(screen.getByRole('button', { name: /^App paired/ }));
    await user.click(screen.getByRole('option', { name: 'Paired' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ paired: true, page: 0 }),
      ),
    );
    expect(router.state.location.search).toBe('?paired=true');

    await user.click(screen.getByRole('button', { name: /App paired\s*:\s*Paired/ }));
    await user.click(screen.getByRole('option', { name: 'Not paired' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ paired: false }),
      ),
    );
    expect(router.state.location.search).toBe('?paired=false');

    await user.click(screen.getByRole('button', { name: /App paired\s*:\s*Not paired/ }));
    await user.click(screen.getByRole('option', { name: 'All' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ paired: expect.anything() }),
      ),
    );
    expect(router.state.location.search).toBe('');
  });

  it('preselects Paired from ?paired=true, the settings-card link', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderAt('/dashboard/hr/employees?paired=true');
    await screen.findByRole('button', { name: 'Ravi Kumar' });

    expect(screen.getByRole('button', { name: /App paired\s*:\s*Paired/ })).toBeInTheDocument();
    expect(employeesApi.list).toHaveBeenCalledWith(expect.objectContaining({ paired: true }));
    expect(employeesApi.list).not.toHaveBeenCalledWith(
      expect.not.objectContaining({ paired: expect.anything() }),
    );
  });

  it('does not show the get-started guide for an empty filtered list', async () => {
    signIn(['VIEW_EMPLOYEES']);
    employeesApi.list.mockResolvedValue(page([]));
    settingsApi.getSetupStatus.mockResolvedValue({
      settingsSaved: false,
      employeeCount: 0,
      attendanceMarked: false,
    });
    renderAt('/dashboard/hr/employees?paired=true');
    expect(await screen.findByText('No employees found')).toBeInTheDocument();
    expect(screen.queryByText('Get started with HR')).not.toBeInTheDocument();
  });
});

describe('Attendance app health banner (R10.5)', () => {
  it('names the shop, the rate as a percentage and the failed count', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_ATTENDANCE']);
    pairingApi.health.mockResolvedValue({ alerts: [ALERT] });
    renderAt('/dashboard/hr/employees');

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Main Street Stores');
    expect(banner).toHaveTextContent('6.3%');
    expect(banner).toHaveTextContent('2 failed punches of 32');
    expect(pairingApi.health).toHaveBeenCalledTimes(1);
  });

  it('falls back to the shop id when the shop is not in the session', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_ATTENDANCE']);
    pairingApi.health.mockResolvedValue({ alerts: [{ ...ALERT, shopId: 'shop-9' }] });
    renderAt('/dashboard/hr/employees');
    expect(await screen.findByRole('alert')).toHaveTextContent('Shop shop-9');
  });

  it('renders nothing when there are no alerts', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_ATTENDANCE']);
    renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await waitFor(() => expect(pairingApi.health).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is hidden and never asked for without VIEW_ATTENDANCE', async () => {
    signIn(['VIEW_EMPLOYEES']);
    pairingApi.health.mockResolvedValue({ alerts: [ALERT] });
    renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    expect(pairingApi.health).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('appHealthAlertText', () => {
  it('formats the rate with one decimal and the counts', () => {
    expect(formatFailureRate(0.0101)).toBe('1.0%');
    expect(formatFailureRate(0.25)).toBe('25.0%');
    expect(appHealthAlertText({ ...ALERT, failed: 1, attempts: 20, rate: 0.05 }, 'Corner')).toBe(
      'Corner: 5.0% of Attendance app punches could not be verified in the last hour (1 failed punch of 20).',
    );
  });
});

// Worker-app 10.2: the Join requests tab (R4.1).
describe('EmployeesPage — Join requests tab (worker-app R4.1)', () => {
  it('shows "Join requests (N)" next to Employees for ADD_EDIT_EMPLOYEES and opens it from ?tab=', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    renderAt('/dashboard/hr/employees?tab=join-requests');
    expect(await screen.findByRole('tab', { name: 'Join requests (2)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Employees' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(await screen.findByRole('table', { name: 'Join requests' })).toBeInTheDocument();
    expect(joinRequestsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' }),
    );
  });

  it('keeps the employees list as the first tab and switches with the URL', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    const router = renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await user.click(await screen.findByRole('tab', { name: 'Join requests (2)' }));
    expect(router.state.location.search).toBe('?tab=join-requests');
    expect(screen.queryByRole('button', { name: 'Ravi Kumar' })).not.toBeInTheDocument();
  });

  it('shows neither the tab nor the count without ADD_EDIT_EMPLOYEES, even with ?tab=', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderAt('/dashboard/hr/employees?tab=join-requests');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText(/Join requests/)).not.toBeInTheDocument();
    expect(joinRequestsApi.list).not.toHaveBeenCalled();
  });
});
