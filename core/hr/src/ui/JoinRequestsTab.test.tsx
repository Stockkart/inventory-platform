// Worker-app 10.2 / 10.5 / 20.4: the Join requests tab (R4.2, R4.4, R4.6, R4.7, R4.10, R4.14,
// R4.16, R11.3).
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import { hrChrome } from '@inventory-platform/ui-kit';
import type { JoinRequestRow, JoinRequestsPageResponse } from '@inventory-platform/hr/types';
import { JoinRequestsTab, bulkResultText, joinRequestPageMeta } from './JoinRequestsTab';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  bulkApprove: vi.fn(),
  bulkReject: vi.fn(),
}));
vi.mock('../api/join-requests.api', () => ({ joinRequestsApi: api }));
vi.mock('../api/download', () => ({ downloadHrBlob: vi.fn().mockRejectedValue(new Error('x')) }));

function row(over: Partial<JoinRequestRow> & Pick<JoinRequestRow, 'id' | 'name'>): JoinRequestRow {
  return {
    phone: '9876543210',
    email: `${over.id}@example.com`,
    photoUrl: null,
    requestedAt: '2026-05-12T08:30:00Z',
    status: 'PENDING',
    hasPossibleMatch: false,
    ...over,
  };
}

const PRIYA = row({ id: 'r1', name: 'Priya Sharma' });
const RAVI = row({ id: 'r2', name: 'Ravi Kumar', hasPossibleMatch: true });

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <JoinRequestsTab />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: { shopId: 'shop-1', userId: 'u1' } } as never);
  api.list.mockResolvedValue({ items: [PRIYA, RAVI], pendingCount: 2, page: 0 });
  api.approve.mockResolvedValue({ id: 'r1', outcome: 'APPROVED_CREATED', employeeId: 'e9' });
  api.bulkApprove.mockResolvedValue({
    approved: 1,
    skipped: [{ id: 'r2', reason: 'POSSIBLE_MATCH' }],
    failed: [],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null } as never);
});

const rowOf = (name: string) =>
  screen.getByRole('button', { name }).closest('tr') as HTMLTableRowElement;

describe('JoinRequestsTab (R4.2, R4.4, R4.6)', () => {
  it('lists the snapshot fields and the match badge', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    expect(api.list).toHaveBeenCalledWith({ status: 'PENDING', page: 0, size: 20 });

    const priya = within(rowOf('Priya Sharma'));
    expect(priya.getByText('9876543210')).toBeInTheDocument();
    expect(priya.getByText('r1@example.com')).toBeInTheDocument();
    expect(priya.getByText(/12 May 2026/)).toBeInTheDocument();
    expect(priya.queryByText('Possible match')).not.toBeInTheDocument();

    const ravi = within(rowOf('Ravi Kumar'));
    expect(ravi.getByText('Possible match')).toBeInTheDocument();
    // No Join / Link kind column (D11).
    expect(screen.queryByRole('columnheader', { name: 'Kind' })).toBeNull();
    expect(screen.queryByText(/^Join$|^Link\b/)).toBeNull();
  });

  it('Approve on a row without a match creates the employee straight away', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(within(rowOf('Priya Sharma')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r1', { mode: 'CREATE' }));
  });

  it('bulk approve reports "Approved 1. 1 needs your review" and highlights the skipped row', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve selected' }));
    await waitFor(() => expect(api.bulkApprove).toHaveBeenCalledWith(['r1', 'r2']));
    expect(await screen.findByRole('status')).toHaveTextContent('Approved 1. 1 needs your review');
    expect(rowOf('Ravi Kumar')).toHaveAttribute('data-skipped', 'true');
    expect(rowOf('Ravi Kumar')).toHaveClass(hrChrome.hrJoinRowSkipped);
    expect(rowOf('Ravi Kumar')).not.toHaveAttribute('style');
    expect(rowOf('Priya Sharma')).not.toHaveAttribute('data-skipped');
  });
});

// Worker-app 20.4: the redesigned rows (R4.2, R4.14) and the toolbar's reject (R4.16).
describe('JoinRequestsTab — row avatar, relative time, bulk reject dialog (R4.14, R4.16)', () => {
  it('shows a 32 px avatar (hrJoinRowAvatar) and the relative time with the exact IST title', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    api.list.mockResolvedValue({
      items: [row({ id: 'r1', name: 'Priya Sharma', requestedAt: twoHoursAgo })],
      pendingCount: 1,
      page: 0,
    });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    const cells = within(rowOf('Priya Sharma')).getAllByRole('cell');
    expect(within(cells[1]).getByText('PS')).toHaveClass(hrChrome.hrJoinRowAvatar);
    const time = within(cells[4]).getByText('2 h ago');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('title', expect.stringMatching(/ IST$/));
    expect(time).toHaveAttribute('aria-label', `Requested ${time.getAttribute('title')}`);
    expect(time).toHaveAttribute('datetime', twoHoursAgo);
    // An old request falls back to the IST date, so the exact day is still in the row.
    expect(screen.queryByText(/12 May 2026/)).toBeNull();
  });

  it('Reject selected still opens the RejectReasonModal (the drawer rejects inline)', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Sharma' }));
    await user.click(screen.getByRole('button', { name: 'Reject selected' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject request' });
    expect(within(dialog).getByRole('textbox', { name: /Reason/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('opening a row shows the drawer with the match card, not a link-or-create dialog', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue({
      ...RAVI,
      possibleMatch: {
        employeeId: 'e14',
        code: 'EMP-014',
        name: 'Ravi',
        status: 'ACTIVE',
        linked: false,
      },
    });
    renderTab();
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await user.click(screen.getByRole('button', { name: 'Ravi Kumar' }));
    const drawer = await screen.findByRole('dialog', { name: 'Ravi Kumar' });
    expect(within(drawer).getByRole('region', { name: 'Possible match' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Link to existing' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});

// R4.2, R11.3: a row shows the snapshot the worker submitted and nothing else, even when a newer
// backend sends more.
describe('JoinRequestsTab — row fields and nothing else (R4.2, R11.3)', () => {
  it('renders exactly checkbox, initial, name, phone, email, requested-at, match, Approve / Reject', async () => {
    const leaky = {
      ...PRIYA,
      aadhaar: '123412341234',
      pan: 'ABCDE1234F',
      address: '12 MG Road, Bengaluru',
      userId: 'u-priya',
    } as unknown as JoinRequestRow;
    api.list.mockResolvedValue({ items: [leaky], pendingCount: 1, page: 0 });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Select all on this page',
      'Name',
      'Phone',
      'Email',
      'Requested',
      'Match',
      'Actions',
    ]);
    const tr = rowOf('Priya Sharma');
    const cells = within(tr).getAllByRole('cell');
    expect(cells).toHaveLength(7);
    expect(
      within(cells[0]).getByRole('checkbox', { name: 'Select Priya Sharma' }),
    ).not.toBeChecked();
    // No photo: the initials stand in next to the name.
    expect(cells[1]).toHaveTextContent('PS');
    expect(within(cells[1]).queryByTestId('join-request-photo')).toBeNull();
    expect(within(cells[1]).getByRole('button', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(cells[2]).toHaveTextContent('9876543210');
    expect(cells[3]).toHaveTextContent('r1@example.com');
    expect(cells[4]).toHaveTextContent(/12 May 2026/);
    expect(cells[5]).toHaveTextContent('—');
    expect(
      within(cells[6])
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Reject', 'Approve']);

    // Nothing the row type does not name reaches the screen.
    expect(tr).not.toHaveTextContent('123412341234');
    expect(tr).not.toHaveTextContent('ABCDE1234F');
    expect(tr).not.toHaveTextContent('MG Road');
    expect(tr).not.toHaveTextContent('u-priya');
    expect(screen.queryByText(/Aadhaar|PAN|Address/)).toBeNull();
  });

  it('lists newest first exactly as the server orders the page', async () => {
    const older = row({ id: 'r0', name: 'Older One', requestedAt: '2026-05-10T08:30:00Z' });
    api.list.mockResolvedValue({ items: [PRIYA, older], pendingCount: 2, page: 0 });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getByRole('button', { name: /One|Sharma/ }).textContent);
    expect(names).toEqual(['Priya Sharma', 'Older One']);
  });

  it('the Rejected filter asks for REJECTED rows and offers no selection or actions', async () => {
    const user = userEvent.setup();
    api.list.mockImplementation(({ status }: { status: string }) =>
      Promise.resolve(
        status === 'REJECTED'
          ? {
              items: [row({ id: 'r3', name: 'Gone Away', status: 'REJECTED' })],
              pendingCount: 2,
              page: 0,
            }
          : { items: [PRIYA, RAVI], pendingCount: 2, page: 0 },
      ),
    );
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    expect(screen.getByText('2 pending')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Status\s*:\s*Pending/ }));
    await user.click(screen.getByRole('option', { name: 'Rejected' }));
    await screen.findByRole('button', { name: 'Gone Away' });
    expect(api.list).toHaveBeenLastCalledWith({ status: 'REJECTED', page: 0, size: 20 });
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve selected' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject selected' })).toBeNull();
  });
});

describe('JoinRequestsTab — link-or-create and refusals (R4.4, R4.5, R4.10)', () => {
  it('Approve on a row with a possible match opens the detail and asks link-or-create', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue({
      ...RAVI,
      possibleMatch: {
        employeeId: 'e14',
        code: 'EMP-014',
        name: 'Ravi',
        status: 'ACTIVE',
        linked: false,
      },
    });
    renderTab();
    await screen.findByRole('button', { name: 'Ravi Kumar' });
    await user.click(within(rowOf('Ravi Kumar')).getByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByText('Link to EMP-014 Ravi, or create a new employee?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link to existing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create new' })).toBeInTheDocument();
    // Nothing was decided yet: the approver must choose.
    expect(api.approve).not.toHaveBeenCalled();
    expect(api.detail).toHaveBeenCalledWith('r2');

    await user.click(screen.getByRole('button', { name: 'Create new' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r2', { mode: 'CREATE' }));
  });

  it.each([
    'This request was already handled',
    'EMP-014 is already linked to another login',
    'EMP-014 has exited. Create a new employee instead.',
  ])('shows the refusal "%s" word for word and refreshes the list', async (message) => {
    const user = userEvent.setup();
    const notifyError = vi.spyOn(useNotify, 'error');
    api.approve.mockRejectedValue(new Error(message));
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    expect(api.list).toHaveBeenCalledTimes(1);

    await user.click(within(rowOf('Priya Sharma')).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(message));
    // The refusal means the cached list is stale: it is asked for again (R4.10).
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    // The row is still there, still Pending, until the server says otherwise.
    expect(
      within(rowOf('Priya Sharma')).getByRole('button', { name: 'Approve' }),
    ).toBeInTheDocument();
  });
});

describe('JoinRequestsTab — reject with a reason (R4.6, R4.7)', () => {
  it('a row Reject opens the reason prompt and sends the trimmed reason', async () => {
    const user = userEvent.setup();
    api.reject.mockResolvedValue({ id: 'r1', outcome: 'REJECTED', employeeId: null });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(within(rowOf('Priya Sharma')).getByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Reject request' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Priya Sharma will see/)).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), '  Wrong shop ');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('r1', { reason: 'Wrong shop' }));
  });

  it('Reject selected applies one reason to every selected id, blank sent as none', async () => {
    const user = userEvent.setup();
    api.bulkReject.mockResolvedValue({ approved: 2, skipped: [], failed: [] });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    await user.click(screen.getByRole('button', { name: 'Reject selected' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Reject 2 requests' })).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Reject 2' }));
    await waitFor(() => expect(api.bulkReject).toHaveBeenCalledWith(['r1', 'r2'], null));
    expect(await screen.findByRole('status')).toHaveTextContent('Rejected 2');
  });
});

describe('JoinRequestsTab — bulk result (R4.6)', () => {
  it('says "Approved 6. 2 need your review" and highlights exactly the skipped rows', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 8 }, (_, i) =>
      row({ id: `r${i + 1}`, name: `Worker ${i + 1}`, hasPossibleMatch: i >= 6 }),
    );
    api.list.mockResolvedValue({ items: rows, pendingCount: 8, page: 0 });
    api.bulkApprove.mockResolvedValue({
      approved: 6,
      skipped: [
        { id: 'r7', reason: 'POSSIBLE_MATCH' },
        { id: 'r8', reason: 'POSSIBLE_MATCH' },
      ],
      failed: [],
    });
    renderTab();
    await screen.findByRole('button', { name: 'Worker 8' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    expect(screen.getByText('8 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve selected' }));

    await waitFor(() => expect(api.bulkApprove).toHaveBeenCalledWith(rows.map((r) => r.id)));
    const alert = await screen.findByRole('status');
    expect(alert).toHaveTextContent('Approved 6. 2 need your review');
    expect(alert).toHaveTextContent('The highlighted rows have a possible match');
    for (let i = 1; i <= 6; i += 1) {
      expect(rowOf(`Worker ${i}`)).not.toHaveAttribute('data-skipped');
    }
    expect(rowOf('Worker 7')).toHaveAttribute('data-skipped', 'true');
    expect(rowOf('Worker 8')).toHaveAttribute('data-skipped', 'true');
    // The selection is cleared once the server has answered.
    expect(screen.queryByText('8 selected')).toBeNull();
  });

  it('lists each failed request by name with the server message', async () => {
    const user = userEvent.setup();
    api.bulkApprove.mockResolvedValue({
      approved: 1,
      skipped: [],
      failed: [{ id: 'r2', message: 'This login is already part of another shop.' }],
    });
    renderTab();
    await screen.findByRole('button', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    await user.click(screen.getByRole('button', { name: 'Approve selected' }));
    const alert = await screen.findByRole('status');
    expect(alert).toHaveTextContent('Approved 1. 1 could not be approved');
    expect(alert).toHaveTextContent('Ravi Kumar: This login is already part of another shop.');
  });
});

describe('bulkResultText', () => {
  it('spells the design sentence', () => {
    expect(bulkResultText('approve', { approved: 6, skipped: [], failed: [] })).toBe('Approved 6');
    expect(
      bulkResultText('approve', {
        approved: 6,
        skipped: [
          { id: 'a', reason: 'POSSIBLE_MATCH' },
          { id: 'b', reason: 'POSSIBLE_MATCH' },
        ],
        failed: [],
      }),
    ).toBe('Approved 6. 2 need your review');
    expect(
      bulkResultText('reject', { approved: 3, skipped: [], failed: [{ id: 'c', message: 'x' }] }),
    ).toBe('Rejected 3. 1 could not be rejected');
  });
});

describe('joinRequestPageMeta', () => {
  it('reads totals from the top level or from a nested page object, and copes without them', () => {
    const flat = {
      items: [],
      pendingCount: 0,
      page: 0,
      totalItems: 42,
      totalPages: 3,
    } as unknown as JoinRequestsPageResponse;
    expect(joinRequestPageMeta(flat)).toEqual({ totalItems: 42, totalPages: 3 });
    const nested = {
      items: [],
      pendingCount: 0,
      page: { page: 0, size: 20, totalItems: 7, totalPages: 1 },
    } as unknown as JoinRequestsPageResponse;
    expect(joinRequestPageMeta(nested)).toEqual({ totalItems: 7, totalPages: 1 });
    expect(
      joinRequestPageMeta({
        items: [],
        pendingCount: 0,
        page: 0,
      } as unknown as JoinRequestsPageResponse),
    ).toEqual({
      totalItems: undefined,
      totalPages: undefined,
    });
    expect(joinRequestPageMeta(undefined)).toEqual({});
  });
});
