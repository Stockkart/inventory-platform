// HR-module spec, task 10.3: the Attendance app pairing cards (R2.1–R2.3, R2.10, R2.12, R2.13, R3.1).
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import { pairingQrPayload } from '@inventory-platform/attendance-protocol';
import type {
  EmployeeResponse,
  PairingCodeResponse,
  PairingStateResponse,
} from '@inventory-platform/hr/types';
import {
  EmployeePairingCard,
  formatCountdown,
  groupedCode,
  pairedLine,
  secondsLeft,
} from './EmployeePairingCard';
import { MyPairingCard } from './MyPairingCard';

const pairingApi = vi.hoisted(() => ({
  state: vi.fn(),
  createCode: vi.fn(),
  unpair: vi.fn(),
  myState: vi.fn(),
  createMyCode: vi.fn(),
}));
vi.mock('../api/pairing.api', () => ({ pairingApi }));

const SHOP = 'shop-1';

function signIn(permissions: HrPermission[], employeeId: string | null = null) {
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

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
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

const NOT_PAIRED: PairingStateResponse = { state: 'NOT_PAIRED' };

/** Paired 3 Apr 2025 (IST), no punches yet. */
const PAIRED: PairingStateResponse = {
  state: 'PAIRED',
  phoneModel: 'Redmi Note 11',
  os: 'ANDROID',
  pairedAt: '2025-04-03T04:30:00Z',
  lastPunchAt: null,
  pairedBy: 'u9',
  consentVersion: 1,
};

function freshCode(minutes = 15): PairingCodeResponse {
  const code = 'ABCDEFGH';
  return {
    code,
    qrPayload: pairingQrPayload(code),
    expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
  };
}

beforeEach(() => {
  pairingApi.state.mockResolvedValue(NOT_PAIRED);
  pairingApi.myState.mockResolvedValue(NOT_PAIRED);
  pairingApi.createCode.mockResolvedValue(freshCode());
  pairingApi.createMyCode.mockResolvedValue(freshCode());
  pairingApi.unpair.mockResolvedValue(NOT_PAIRED);
});

afterEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null } as never);
});

describe('pairing card text helpers', () => {
  it('builds the Paired line of R2.2, ending "no punches yet" without a punch', () => {
    expect(pairedLine(PAIRED, new Date('2026-04-10T05:00:00Z'))).toBe(
      'Paired · Redmi Note 11 · since 3 Apr 2025 · no punches yet',
    );
  });

  it('shows "last punch today HH:MM" for a punch on the current Indian day', () => {
    // 03:42Z = 09:12 IST on 10 Apr 2026.
    const now = new Date('2026-04-10T05:00:00Z');
    expect(pairedLine({ ...PAIRED, lastPunchAt: '2026-04-10T03:42:00Z' }, now)).toBe(
      'Paired · Redmi Note 11 · since 3 Apr 2025 · last punch today 09:12',
    );
    expect(pairedLine({ ...PAIRED, lastPunchAt: '2026-04-09T12:35:00Z' }, now)).toBe(
      'Paired · Redmi Note 11 · since 3 Apr 2025 · last punch 9 Apr 2026 18:05',
    );
  });

  it('groups the 8 characters for reading and counts down whole seconds', () => {
    expect(groupedCode('ABCDEFGH')).toBe('ABCD-EFGH');
    const now = new Date('2026-04-10T05:00:00Z');
    expect(secondsLeft('2026-04-10T05:14:30Z', now)).toBe(870);
    expect(secondsLeft('2026-04-10T04:59:00Z', now)).toBe(0);
    expect(formatCountdown(870)).toBe('14:30');
    expect(formatCountdown(5)).toBe('0:05');
  });
});

describe('EmployeePairingCard', () => {
  it('is hidden without ADD_EDIT_EMPLOYEES and asks the server nothing', async () => {
    signIn(['VIEW_EMPLOYEES']);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    expect(screen.queryByText('Attendance app')).not.toBeInTheDocument();
    await waitFor(() => expect(pairingApi.state).not.toHaveBeenCalled());
  });

  it('shows "Not paired" with only the Pair button', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    expect(await screen.findByText('Not paired')).toBeInTheDocument();
    expect(pairingApi.state).toHaveBeenCalledWith('e1');
    expect(screen.getByRole('button', { name: 'Pair a phone' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpair phone' })).not.toBeInTheDocument();
  });

  it('shows the Paired line with model, since-date and "no punches yet"', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    pairingApi.state.mockResolvedValue(PAIRED);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    expect(
      await screen.findByText('Paired · Redmi Note 11 · since 3 Apr 2025 · no punches yet'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unpair phone' })).toBeInTheDocument();
  });

  it('"Pair a phone" shows the QR code, the grouped characters and a 15-minute countdown', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    await screen.findByText('Not paired');

    await userEvent.click(screen.getByRole('button', { name: 'Pair a phone' }));
    await waitFor(() => expect(pairingApi.createCode).toHaveBeenCalledWith('e1'));

    const panel = await screen.findByLabelText('Pairing code');
    expect(within(panel).getByTestId('pairing-code')).toHaveTextContent('ABCD-EFGH');
    expect(within(panel).getByRole('img', { name: 'QR code for pairing' })).toBeInTheDocument();
    // 15 minutes, give or take the seconds the test took.
    expect(within(panel).getByRole('timer')).toHaveTextContent(/^Expires in 1[45]:\d{2}$/);
    // No replace question for an unpaired employee.
    expect(screen.queryByText('Replace the old phone?')).not.toBeInTheDocument();
  });

  it('asks "Replace the old phone?" first when a phone is paired; cancelling makes no code', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    pairingApi.state.mockResolvedValue(PAIRED);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    await screen.findByText(/^Paired · Redmi Note 11/);

    await userEvent.click(screen.getByRole('button', { name: 'Pair a phone' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Replace the old phone?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep the old phone' }));
    expect(pairingApi.createCode).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Pair a phone' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace' }),
    );
    await waitFor(() => expect(pairingApi.createCode).toHaveBeenCalledWith('e1'));
    expect(await screen.findByTestId('pairing-code')).toHaveTextContent('ABCD-EFGH');
    // R2.10: the old phone stays paired until the new one finishes.
    expect(screen.getByText(/old phone stays paired/)).toBeInTheDocument();
  });

  it('"Unpair phone" confirms, then calls the unpair endpoint and shows Not paired', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    pairingApi.state.mockResolvedValue(PAIRED);
    renderWithQuery(<EmployeePairingCard employee={RAVI} />);
    await screen.findByText(/^Paired · Redmi Note 11/);

    await userEvent.click(screen.getByRole('button', { name: 'Unpair phone' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Unpair this phone?')).toBeInTheDocument();
    expect(pairingApi.unpair).not.toHaveBeenCalled();

    // The server answers Not paired, and the refetch after the write agrees.
    pairingApi.state.mockResolvedValue(NOT_PAIRED);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpair' }));
    await waitFor(() => expect(pairingApi.unpair).toHaveBeenCalledWith('e1'));
    expect(await screen.findByText('Not paired')).toBeInTheDocument();
  });

  it('shows the state but no Pair button for an exited employee', async () => {
    signIn(['VIEW_EMPLOYEES', 'ADD_EDIT_EMPLOYEES']);
    renderWithQuery(
      <EmployeePairingCard employee={{ ...RAVI, status: 'EXITED', exitDate: '2026-03-31' }} />,
    );
    expect(await screen.findByText('Not paired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pair a phone' })).not.toBeInTheDocument();
  });
});

describe('MyPairingCard', () => {
  it('renders nothing when the login is not linked to an employee', async () => {
    signIn([], null);
    renderWithQuery(<MyPairingCard />);
    expect(screen.queryByText('Attendance app')).not.toBeInTheDocument();
    await waitFor(() => expect(pairingApi.myState).not.toHaveBeenCalled());
  });

  it('uses the /me endpoints for a linked employee and offers no Unpair button', async () => {
    signIn([], 'e1');
    renderWithQuery(<MyPairingCard />);
    expect(await screen.findByText('Not paired')).toBeInTheDocument();
    expect(pairingApi.myState).toHaveBeenCalled();
    expect(pairingApi.state).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Pair a phone' }));
    await waitFor(() => expect(pairingApi.createMyCode).toHaveBeenCalled());
    expect(pairingApi.createCode).not.toHaveBeenCalled();
    expect(await screen.findByTestId('pairing-code')).toHaveTextContent('ABCD-EFGH');
    expect(screen.queryByRole('button', { name: 'Unpair phone' })).not.toBeInTheDocument();
  });
});
