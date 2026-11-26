// Worker-app 10.3 / 10.5: "Request profile details" on the employee's Profile tab (R8.7). The
// button is for ADD_EDIT_EMPLOYEES and a linked login only; once asked, the card says when
// ("Requested on 12 May 2026", the Indian calendar day) instead of offering the button again.
// The same card rendered through the detail page is covered in EmployeePages.test.tsx.
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import type { EmployeeResponse } from '@inventory-platform/hr/types';
import { EmployeeProfileTab } from './EmployeeProfileTab';

const employeesApi = vi.hoisted(() => ({
  update: vi.fn(),
  exit: vi.fn(),
  linkableLogins: vi.fn(),
}));
// The tab renders `EmployeePairingCard` (HR-module R2.1); its own tests live next to it.
const pairingApi = vi.hoisted(() => ({ state: vi.fn(), createCode: vi.fn(), unpair: vi.fn() }));
const joinRequestsApi = vi.hoisted(() => ({ requestProfile: vi.fn() }));
vi.mock('../api/employees.api', () => ({ employeesApi }));
vi.mock('../api/pairing.api', () => ({ pairingApi }));
vi.mock('../api/join-requests.api', () => ({ joinRequestsApi }));

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

function renderTab(employee: EmployeeResponse) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <EmployeeProfileTab employee={employee} />
    </QueryClientProvider>,
  );
  return {
    rerender: (next: EmployeeResponse) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <EmployeeProfileTab employee={next} />
        </QueryClientProvider>,
      ),
  };
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
  salaryRevisions: [],
  paymentMethod: 'CASH',
  payHidden: false,
  revision: 1,
};
const LINKED: EmployeeResponse = { ...RAVI, userId: 'u9' };
// 20:30 UTC on 11 May is already 12 May in Asia/Kolkata.
const REQUESTED: EmployeeResponse = { ...LINKED, profileRequestedAt: '2026-05-11T20:30:00Z' };

const EDITOR: HrPermission[] = ['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES'];

// While the server answers, the spinner's "Loading" joins the accessible name.
const requestProfileButton = () => screen.getByRole('button', { name: /Request profile details$/ });
const noRequestProfileButton = () =>
  screen.queryByRole('button', { name: /Request profile details$/ });

beforeEach(() => {
  employeesApi.linkableLogins.mockResolvedValue([]);
  pairingApi.state.mockResolvedValue({ state: 'NOT_PAIRED' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('EmployeeProfileTab — Request profile details (worker-app R8.7)', () => {
  it('offers the button for ADD_EDIT_EMPLOYEES on a linked employee, and nothing is asked yet', () => {
    signIn(EDITOR);
    renderTab(LINKED);
    expect(screen.getByRole('heading', { name: 'Profile details' })).toBeInTheDocument();
    expect(requestProfileButton()).toBeEnabled();
    expect(screen.queryByText(/^Requested on/)).toBeNull();
    expect(joinRequestsApi.requestProfile).not.toHaveBeenCalled();
  });

  it('asks the server once, shows the button busy meanwhile, then confirms by name', async () => {
    const user = userEvent.setup();
    const notifySuccess = vi.spyOn(useNotify, 'success');
    signIn(EDITOR);
    let resolveRequest: (value: EmployeeResponse) => void = () => undefined;
    joinRequestsApi.requestProfile.mockImplementation(
      () =>
        new Promise<EmployeeResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const { rerender } = renderTab(LINKED);

    await user.click(requestProfileButton());
    expect(joinRequestsApi.requestProfile).toHaveBeenCalledTimes(1);
    expect(joinRequestsApi.requestProfile).toHaveBeenCalledWith('e1');
    // While the server answers: no second request possible.
    await waitFor(() => expect(requestProfileButton()).toHaveAttribute('aria-busy', 'true'));
    expect(requestProfileButton()).toBeDisabled();
    await user.click(requestProfileButton());
    expect(joinRequestsApi.requestProfile).toHaveBeenCalledTimes(1);

    resolveRequest(REQUESTED);
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Asked Ravi Kumar for their profile details'),
    );

    // The parent re-reads the employee with the stamp set (the mutation seeds the detail query).
    rerender(REQUESTED);
    expect(screen.getByText('Requested on 12 May 2026')).toBeInTheDocument();
    expect(noRequestProfileButton()).toBeNull();
  });

  it('shows "Requested on <Indian calendar day>" instead of the button once asked', () => {
    signIn(EDITOR);
    renderTab(REQUESTED);
    expect(screen.getByRole('heading', { name: 'Profile details' })).toBeInTheDocument();
    expect(screen.getByText('Requested on 12 May 2026')).toBeInTheDocument();
    expect(noRequestProfileButton()).toBeNull();
    // The stamp is a day, not a time, and never the raw instant.
    expect(screen.queryByText(/2026-05-11|20:30/)).toBeNull();
  });

  it('shows a server refusal word for word and offers the button again', async () => {
    const user = userEvent.setup();
    const notifyError = vi.spyOn(useNotify, 'error');
    signIn(EDITOR);
    joinRequestsApi.requestProfile.mockRejectedValue(new Error('EMP-001 has exited.'));
    renderTab(LINKED);

    await user.click(requestProfileButton());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('EMP-001 has exited.'));
    expect(requestProfileButton()).toBeEnabled();
    expect(screen.queryByText(/^Requested on/)).toBeNull();
  });

  it('is hidden without ADD_EDIT_EMPLOYEES, even when already requested', () => {
    signIn(['VIEW_EMPLOYEES', 'VIEW_SALARIES']);
    renderTab(REQUESTED);
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(noRequestProfileButton()).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Profile details' })).toBeNull();
    expect(screen.queryByText(/^Requested on/)).toBeNull();
  });

  it('is hidden when the employee has no linked login: there is nobody to ask', () => {
    signIn(EDITOR);
    renderTab(RAVI);
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    expect(noRequestProfileButton()).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Profile details' })).toBeNull();
  });
});
