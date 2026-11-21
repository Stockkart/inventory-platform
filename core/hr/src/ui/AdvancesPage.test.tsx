import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import { todayIso, type AdvanceResponse } from '@inventory-platform/hr/types';
import { AdvancesPage } from '../pages/AdvancesPage';

const advancesApi = vi.hoisted(() => ({
  list: vi.fn(),
  record: vi.fn(),
  cancel: vi.fn(),
  statement: vi.fn(),
}));
const employeesApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../api/advances.api', () => ({ advancesApi }));
vi.mock('../api/employees.api', () => ({ employeesApi }));

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
      { path: '/dashboard/hr/advances', element: <AdvancesPage /> },
      { path: '/dashboard/hr/employees/:employeeId', element: <>Employee detail page</> },
    ],
    { initialEntries: ['/dashboard/hr/advances'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const FRESH: AdvanceResponse = {
  id: 'a1',
  employeeId: 'e1',
  employeeCode: 'EMP-001',
  employeeName: 'Asha',
  date: '2026-09-01',
  amount: 5000,
  monthlyDeduction: 1000,
  paidBy: 'CASH',
  status: 'ACTIVE',
  recovered: 0,
  outstanding: 5000,
  journalPosted: true,
};
const PART_RECOVERED: AdvanceResponse = {
  ...FRESH,
  id: 'a2',
  employeeId: 'e2',
  employeeCode: 'EMP-002',
  employeeName: 'Ravi',
  amount: 3000,
  recovered: 1000,
  outstanding: 2000,
};

const MANAGE: HrPermission[] = ['VIEW_EMPLOYEES', 'VIEW_SALARIES', 'MANAGE_ADVANCES'];

beforeEach(() => {
  advancesApi.list.mockResolvedValue([FRESH, PART_RECOVERED]);
  advancesApi.record.mockResolvedValue({ ...FRESH, id: 'a3' });
  advancesApi.cancel.mockResolvedValue({ ...FRESH, status: 'CANCELLED' });
  advancesApi.statement.mockResolvedValue({
    employeeId: 'e2',
    employeeName: 'Ravi',
    rows: [
      {
        date: '2026-09-01',
        kind: 'GIVEN',
        advanceId: 'a2',
        amount: 3000,
        balance: 3000,
        cancelled: false,
      },
      {
        date: '2026-09-30',
        kind: 'RECOVERED',
        advanceId: 'a2',
        period: '2026-09',
        amount: 1000,
        balance: 2000,
        cancelled: false,
      },
    ],
    outstanding: 2000,
  });
  employeesApi.list.mockResolvedValue({
    items: [
      { id: 'e1', code: 'EMP-001', name: 'Asha', status: 'ACTIVE' },
      { id: 'e2', code: 'EMP-002', name: 'Ravi', status: 'ACTIVE' },
    ],
    page: { page: 0, size: 100, totalItems: 2, totalPages: 1 },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

async function openGiveModal(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Ravi');
  await user.click(screen.getByRole('button', { name: 'Give advance' }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: /Employee/ }));
  await user.click(await screen.findByRole('option', { name: /Asha/ }));
  return dialog;
}

describe('AdvancesPage', () => {
  it('lists advances with ₹ amounts, recovered and still owed', async () => {
    signIn(MANAGE);
    renderPage();
    expect(await screen.findByText('Ravi')).toBeInTheDocument();
    expect(screen.getAllByText('₹5,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('₹2,000.00')).toBeInTheDocument();
    expect(advancesApi.list).toHaveBeenCalledWith(undefined);
  });

  it('records an advance with paid by UPI', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    const dialog = await openGiveModal(user);
    await user.type(within(dialog).getByLabelText('Amount (₹)'), '4000');
    await user.type(within(dialog).getByLabelText('Take from pay each month (₹)'), '500');
    await user.click(within(dialog).getByRole('button', { name: 'UPI' }));
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'School fees');
    await user.click(within(dialog).getByRole('button', { name: 'Record advance' }));

    await waitFor(() =>
      expect(advancesApi.record).toHaveBeenCalledWith({
        employeeId: 'e1',
        date: todayIso(),
        amount: 4000,
        monthlyDeduction: 500,
        paidBy: 'UPI',
        note: 'School fees',
      }),
    );
  });

  it('refuses a monthly deduction above the amount before calling the server', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    const dialog = await openGiveModal(user);
    await user.type(within(dialog).getByLabelText('Amount (₹)'), '1000');
    await user.type(within(dialog).getByLabelText('Take from pay each month (₹)'), '1500');
    await user.click(within(dialog).getByRole('button', { name: 'Record advance' }));
    expect(
      await within(dialog).findByText('The monthly deduction cannot be more than the advance'),
    ).toBeInTheDocument();
    expect(advancesApi.record).not.toHaveBeenCalled();
  });

  it('cancels with a reason and hides Cancel once anything was recovered', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    await screen.findByText('Ravi');
    // Ravi's advance is partly recovered: no cancel button at all.
    expect(screen.queryByRole('button', { name: /Cancel advance of .* for Ravi/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Cancel advance of ₹5,000.00 for Asha' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel advance' }));
    expect(
      await within(dialog).findByText('Please give a reason for cancelling this advance'),
    ).toBeInTheDocument();
    expect(advancesApi.cancel).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Reason'), 'Given by mistake');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel advance' }));
    await waitFor(() => expect(advancesApi.cancel).toHaveBeenCalledWith('a1', 'Given by mistake'));
  });

  it('shows the statement with a running balance', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Show advance statement for Ravi' }),
    );
    expect(await screen.findByText('Taken from September 2026 pay')).toBeInTheDocument();
    expect(screen.getByText('Still owed now: ₹2,000.00')).toBeInTheDocument();
    expect(advancesApi.statement).toHaveBeenCalledWith('e2');
  });

  it('filters by employee', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    await screen.findByText('Ravi');
    await user.click(screen.getByRole('button', { name: /Employee/ }));
    await user.click(await screen.findByRole('option', { name: /Ravi/ }));
    await waitFor(() => expect(advancesApi.list).toHaveBeenLastCalledWith('e2'));
  });

  it('tells users without MANAGE_ADVANCES and makes no calls', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderPage();
    expect(
      await screen.findByText('You do not have permission to manage advances in this shop.'),
    ).toBeInTheDocument();
    expect(advancesApi.list).not.toHaveBeenCalled();
  });
});

describe('employee names (run F9)', () => {
  it('shows each employee as a link to the employee page', async () => {
    const user = userEvent.setup();
    signIn(MANAGE);
    renderPage();
    const link = await screen.findByRole('button', { name: 'Ravi' });
    expect(link.className).toMatch(/linkButton/);
    await user.click(link);
    expect(await screen.findByText('Employee detail page')).toBeInTheDocument();
  });
});
