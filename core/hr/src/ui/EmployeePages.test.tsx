import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import type { EmployeeResponse } from '@inventory-platform/hr/types';
import { EmployeeDetailPage } from '../pages/EmployeeDetailPage';
import { EmployeesPage } from '../pages/EmployeesPage';

const employeesApi = vi.hoisted(() => ({
  list: vi.fn(),
  designations: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  addSalaryRevision: vi.fn(),
  exit: vi.fn(),
  linkableLogins: vi.fn(),
}));
const settingsApi = vi.hoisted(() => ({ getSetupStatus: vi.fn() }));
vi.mock('../api/employees.api', () => ({ employeesApi }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: settingsApi }));

const SHOP = 'shop-1';

function signIn(permissions: HrPermission[], { owner = false, userId = 'u1' } = {}) {
  useAuthStore.setState({ user: { shopId: SHOP, userId } } as never);
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

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/employees', element: <EmployeesPage /> },
      { path: '/dashboard/hr/employees/:employeeId', element: <EmployeeDetailPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const RAVI: EmployeeResponse = {
  id: 'e1',
  code: 'EMP-001',
  name: 'Ravi Kumar',
  designation: 'Helper',
  phone: '9876543210',
  status: 'ACTIVE',
  joinDate: '2026-01-05',
  payType: 'MONTHLY',
  salaryAmount: 14500,
  salaryRevisions: [{ effectiveFrom: '2026-01', payType: 'MONTHLY', amount: 14500 }],
  paymentMethod: 'UPI',
  upiId: 'ravi@okaxis',
  payHidden: false,
  revision: 1,
};

const page = (items: EmployeeResponse[]) => ({
  items,
  page: { page: 0, size: 20, totalItems: items.length, totalPages: 1 },
});

beforeEach(() => {
  employeesApi.list.mockResolvedValue(page([RAVI]));
  employeesApi.designations.mockResolvedValue(['Helper', 'Cook']);
  employeesApi.linkableLogins.mockResolvedValue([]);
  settingsApi.getSetupStatus.mockResolvedValue({
    settingsSaved: true,
    employeeCount: 1,
    attendanceMarked: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('EmployeesPage', () => {
  it('searches and filters by status and designation', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES']);
    renderAt('/dashboard/hr/employees');

    expect(await screen.findByRole('button', { name: 'Ravi Kumar' })).toBeInTheDocument();
    expect(employeesApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'ACTIVE', page: 0, size: 20 }),
    );

    await user.type(screen.getByPlaceholderText('Search by name, code or phone'), 'ravi');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'ravi' })),
    );

    await user.click(screen.getByRole('button', { name: /Status\s*:\s*Active/ }));
    await user.click(screen.getByRole('option', { name: 'Exited' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'ravi', status: 'EXITED' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: /^Designation/ }));
    await user.click(await screen.findByRole('option', { name: 'Cook' }));
    await waitFor(() =>
      expect(employeesApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ designation: 'Cook', status: 'EXITED' }),
      ),
    );
  });

  it('hides Add employee without ADD_EDIT_EMPLOYEES', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderAt('/dashboard/hr/employees');
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    expect(screen.queryByRole('button', { name: 'Add employee' })).not.toBeInTheDocument();
  });

  it('shows the get-started guide when the shop has no employees', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    employeesApi.list.mockResolvedValue(page([]));
    settingsApi.getSetupStatus.mockResolvedValue({
      settingsSaved: false,
      employeeCount: 0,
      attendanceMarked: false,
    });
    renderAt('/dashboard/hr/employees');
    expect(await screen.findByText('Get started with HR')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'HR set-up steps' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(within(steps).getByRole('button', { name: 'Open HR settings' })).toBeInTheDocument();
  });

  it('checks IFSC like the backend before sending', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES', 'VIEW_SALARIES']);
    renderAt('/dashboard/hr/employees');

    await user.click(await screen.findByRole('button', { name: 'Add employee' }));
    await user.type(screen.getByLabelText(/^Name/), 'Sita');
    await user.click(screen.getByRole('button', { name: 'Bank transfer' }));
    await user.type(screen.getByLabelText('Bank account number'), '123456789');
    await user.type(screen.getByLabelText('IFSC'), 'hdfc1234');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(
      await screen.findByText('IFSC must have 11 characters like ABCD0123456'),
    ).toBeInTheDocument();
    expect(employeesApi.create).not.toHaveBeenCalled();
  });
});

describe('EmployeeDetailPage', () => {
  it('has no Salary tab without VIEW_SALARIES', async () => {
    signIn(['VIEW_EMPLOYEES']);
    employeesApi.get.mockResolvedValue({
      ...RAVI,
      payHidden: true,
      payType: null,
      salaryAmount: null,
      salaryRevisions: null,
      paymentMethod: null,
      upiId: 'ra***@okaxis',
    });
    renderAt('/dashboard/hr/employees/e1');

    expect(await screen.findByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Salary' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pay this month/)).not.toBeInTheDocument();
    // Masked value shown exactly as the server sent it.
    expect(screen.getByText('UPI ra***@okaxis')).toBeInTheDocument();
  });

  it('shows the Salary tab with VIEW_SALARIES and lists revisions in ₹', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES']);
    employeesApi.get.mockResolvedValue(RAVI);
    renderAt('/dashboard/hr/employees/e1');

    await user.click(await screen.findByRole('tab', { name: 'Salary' }));
    const history = screen.getByRole('table', { name: 'Salary history' });
    expect(within(history).getByText('January 2026')).toBeInTheDocument();
    expect(within(history).getByText('₹14,500.00')).toBeInTheDocument();
  });

  it('still hides salary when the server withheld pay, even with VIEW_SALARIES', async () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES']);
    employeesApi.get.mockResolvedValue({ ...RAVI, payHidden: true });
    renderAt('/dashboard/hr/employees/e1');
    await screen.findByRole('tab', { name: 'Profile' });
    expect(screen.queryByRole('tab', { name: 'Salary' })).not.toBeInTheDocument();
  });

  it('linking a login sends the full record back with revision and payment details', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES', 'VIEW_SALARIES']);
    employeesApi.get.mockResolvedValue(RAVI);
    employeesApi.linkableLogins.mockResolvedValue([
      { userId: 'u9', name: 'Ravi K', role: 'CASHIER', linkedEmployeeId: null },
      { userId: 'u8', name: 'Taken', role: 'MANAGER', linkedEmployeeId: 'e2' },
    ]);
    employeesApi.update.mockResolvedValue({ ...RAVI, userId: 'u9', revision: 2 });
    renderAt('/dashboard/hr/employees/e1');

    await user.click(await screen.findByRole('button', { name: /Login\s*:\s*Not linked/ }));
    expect(screen.queryByRole('option', { name: /Taken/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Ravi K/ }));

    await waitFor(() => expect(employeesApi.update).toHaveBeenCalledTimes(1));
    expect(employeesApi.update.mock.calls[0][0]).toBe('e1');
    expect(employeesApi.update.mock.calls[0][1]).toMatchObject({
      userId: 'u9',
      revision: 1,
      code: 'EMP-001',
      paymentMethod: 'UPI',
      upiId: 'ravi@okaxis',
    });
  });
  it('without VIEW_SALARIES shows the link read-only, keeps the email and sends both back', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    const stored = {
      ...RAVI,
      payHidden: true,
      paymentMethod: null,
      upiId: 'ra***@okaxis',
      email: 'ravi@example.com',
      userId: 'u9',
    };
    employeesApi.get.mockResolvedValue(stored);
    employeesApi.linkableLogins.mockResolvedValue([
      { userId: 'u9', name: 'Ravi K', role: 'CASHIER', linkedEmployeeId: 'e1' },
    ]);
    employeesApi.update.mockResolvedValue({ ...stored, name: 'Ravi Kumar S', revision: 2 });
    renderAt('/dashboard/hr/employees/e1');

    expect(await screen.findByText('Linked to Ravi K')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Login\s*:/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('readonly');
    await user.type(email, 'x');
    expect(email).toHaveValue('ravi@example.com');
    await user.type(screen.getByLabelText(/^Name/), ' S');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(employeesApi.update).toHaveBeenCalledTimes(1));
    expect(employeesApi.update.mock.calls[0][1]).toMatchObject({
      name: 'Ravi Kumar S',
      userId: 'u9',
      email: 'ravi@example.com',
      paymentMethod: null,
      upiId: null,
    });
  });

  it('lists your own login in the picker only for the owner', async () => {
    const user = userEvent.setup();
    const logins = [
      { userId: 'u1', name: 'Me', role: 'MANAGER', linkedEmployeeId: null },
      { userId: 'u9', name: 'Ravi K', role: 'CASHIER', linkedEmployeeId: null },
    ];
    employeesApi.get.mockResolvedValue(RAVI);
    employeesApi.linkableLogins.mockResolvedValue(logins);

    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES', 'VIEW_SALARIES'], { userId: 'u1' });
    renderAt('/dashboard/hr/employees/e1');
    await user.click(await screen.findByRole('button', { name: /Login\s*:\s*Not linked/ }));
    expect(screen.getByRole('option', { name: /Ravi K/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Me/ })).not.toBeInTheDocument();
    cleanup();

    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES', 'VIEW_SALARIES'], {
      owner: true,
      userId: 'u1',
    });
    renderAt('/dashboard/hr/employees/e1');
    await user.click(await screen.findByRole('button', { name: /Login\s*:\s*Not linked/ }));
    expect(screen.getByRole('option', { name: /^Me/ })).toBeInTheDocument();
  });
});
