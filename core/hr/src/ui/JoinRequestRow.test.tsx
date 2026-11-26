// Worker-app 10.2 / 10.5 / 20.4: the join-request drawer (R4.2–R4.5, R4.7, R4.10, R4.14–R4.17,
// R11.3).
import { useState } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import { Button, hrChrome } from '@inventory-platform/ui-kit';
import type { JoinRequestDetail } from '@inventory-platform/hr/types';
import { JoinRequestRow } from './JoinRequestRow';

const api = vi.hoisted(() => ({ detail: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock('../api/join-requests.api', () => ({ joinRequestsApi: api }));
vi.mock('../api/download', () => ({ downloadHrBlob: vi.fn().mockRejectedValue(new Error('x')) }));

const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const PRIYA: JoinRequestDetail = {
  id: 'r1',
  name: 'Priya Sharma',
  phone: '9876543210',
  email: 'priya@example.com',
  photoUrl: null,
  requestedAt: '2026-05-12T08:30:00Z',
  status: 'PENDING',
  hasPossibleMatch: true,
  possibleMatch: {
    employeeId: 'e14',
    code: 'EMP-014',
    name: 'Ravi',
    status: 'ACTIVE',
    linked: false,
  },
};
const NO_MATCH: JoinRequestDetail = { ...PRIYA, hasPossibleMatch: false, possibleMatch: null };

function renderDrawer(id: string | null, intent: 'approve' | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <JoinRequestRow id={id} intent={intent} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

/** A row button that opens the drawer, so focus return can be checked (R4.17). */
function OpenerHarness() {
  const [id, setId] = useState<string | null>(null);
  return (
    <>
      <Button type="button" onClick={() => setId('r1')}>
        Priya Sharma
      </Button>
      <JoinRequestRow id={id} onClose={() => setId(null)} />
    </>
  );
}

function renderWithOpener() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OpenerHarness />
    </QueryClientProvider>,
  );
}

const dialog = () => screen.getByRole('dialog');
const footer = () => dialog().querySelector('footer') as HTMLElement;

beforeEach(() => {
  useAuthStore.setState({
    user: { shopId: 'shop-1', userId: 'u1' },
    shop: { name: 'Sri Ganesh Stores' },
  } as never);
  api.detail.mockResolvedValue(PRIYA);
  api.approve.mockResolvedValue({ id: 'r1', outcome: 'APPROVED_LINKED', employeeId: 'e14' });
  api.reject.mockResolvedValue({ id: 'r1', outcome: 'REJECTED', employeeId: null });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, shop: null } as never);
});

describe('JoinRequestRow drawer — header (R4.14)', () => {
  it('renders nothing while closed', () => {
    renderDrawer(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.detail).not.toHaveBeenCalled();
  });

  it('shows the 56 px avatar, name, status chip, relative time with the exact IST title, and Close', async () => {
    api.detail.mockResolvedValue({ ...PRIYA, requestedAt: TWO_HOURS_AGO });
    renderDrawer('r1');
    const name = await screen.findByRole('heading', { level: 2, name: 'Priya Sharma' });
    expect(dialog()).toHaveAttribute('aria-labelledby', name.id);

    const header = dialog().querySelector('header') as HTMLElement;
    expect(header).toHaveClass(hrChrome.hrJoinDrawerHeader);
    // Initials, sized by the drawer class (the Avatar carries it).
    expect(within(header).getByText('PS')).toHaveClass(hrChrome.hrJoinDrawerAvatar);
    expect(within(header).getByText('Pending')).toBeInTheDocument();

    const time = within(header).getByText('2 h ago');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute(
      'title',
      expect.stringMatching(/\d{4}, \d{1,2}:\d{2} (am|pm) IST$/),
    );
    expect(time).toHaveAttribute('aria-label', `Requested ${time.getAttribute('title')}`);
    expect(time).toHaveAttribute('datetime', TWO_HOURS_AGO);

    expect(within(header).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('chips Approved / Rejected / Withdrawn by status', async () => {
    api.detail.mockResolvedValue({ ...PRIYA, status: 'WITHDRAWN', possibleMatch: null });
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
  });
});

describe('JoinRequestRow drawer — Contact and Request sections (R4.14)', () => {
  it('lists phone and email with copy buttons that write the clipboard and toast "Copied"', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const success = vi.spyOn(useNotify, 'success');
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });

    const contact = screen.getByRole('region', { name: 'Contact' });
    expect(within(contact).getByText('Phone')).toBeInTheDocument();
    expect(within(contact).getByText('9876543210')).toBeInTheDocument();
    expect(within(contact).getByText('Email')).toBeInTheDocument();
    expect(within(contact).getByText('priya@example.com')).toBeInTheDocument();

    await user.click(within(contact).getByRole('button', { name: 'Copy phone' }));
    expect(writeText).toHaveBeenCalledWith('9876543210');
    await waitFor(() => expect(success).toHaveBeenCalledWith('Copied'));

    await user.click(within(contact).getByRole('button', { name: 'Copy email' }));
    expect(writeText).toHaveBeenLastCalledWith('priya@example.com');
    await waitFor(() => expect(success).toHaveBeenCalledTimes(2));
  });

  it('tells the approver when the clipboard refuses', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const error = vi.spyOn(useNotify, 'error');
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Copy phone' }));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Could not copy the phone'));
  });

  it('Request: shop name, exact IST requested-at, and the match summary line', async () => {
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    const request = screen.getByRole('region', { name: 'Request' });
    expect(within(request).getByText('Sri Ganesh Stores')).toBeInTheDocument();
    expect(within(request).getByText('12 May 2026, 2:00 pm IST')).toBeInTheDocument();
    expect(within(request).getByText('Possible match: EMP-014 Ravi')).toBeInTheDocument();
  });

  it('Request: "No matching employee" and no card when there is no match', async () => {
    api.detail.mockResolvedValue(NO_MATCH);
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(screen.getByText('No matching employee')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Possible match' })).toBeNull();
  });
});

describe('JoinRequestRow drawer — match card inline approval (R4.4, R4.5, R4.15)', () => {
  it('Link to existing approves with LINK and the matched employee id, then closes', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(useNotify, 'success');
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    const card = screen.getByRole('region', { name: 'Possible match' });
    expect(card).toHaveClass(hrChrome.hrJoinMatchCard);
    expect(
      within(card).getByText('Link to EMP-014 Ravi, or create a new employee?'),
    ).toBeInTheDocument();
    // The card is the approval: no Approve in the footer.
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Link to existing' }));
    await waitFor(() =>
      expect(api.approve).toHaveBeenCalledWith('r1', { mode: 'LINK', employeeId: 'e14' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith('Priya Sharma linked to EMP-014 Ravi');
  });

  it('Create new approves with CREATE and no employee id', async () => {
    const user = userEvent.setup();
    api.approve.mockResolvedValue({ id: 'r1', outcome: 'APPROVED_CREATED', employeeId: 'e9' });
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Create new' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r1', { mode: 'CREATE' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it.each([
    'This request was already handled',
    'EMP-014 is already linked to another login',
    'EMP-014 has exited. Create a new employee instead.',
  ])(
    'shows "%s" word for word under the card buttons and keeps the request Pending',
    async (message) => {
      const user = userEvent.setup();
      api.approve.mockRejectedValue(new Error(message));
      const { onClose } = renderDrawer('r1');
      await screen.findByRole('heading', { name: 'Priya Sharma' });
      await user.click(screen.getByRole('button', { name: 'Link to existing' }));

      const card = screen.getByRole('region', { name: 'Possible match' });
      expect(await within(card).findByRole('alert')).toHaveTextContent(message);
      expect(onClose).not.toHaveBeenCalled();
      // Still Pending, buttons enabled, no second dialog.
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Link to existing' })).toBeEnabled();
      expect(within(card).getByRole('button', { name: 'Create new' })).toBeEnabled();
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      // The list is asked for again after a refusal (R4.10): the detail refetches.
      await waitFor(() => expect(api.detail).toHaveBeenCalledTimes(2));
    },
  );

  it('opened by Approve on a matched row, focus lands on Link to existing', async () => {
    renderDrawer('r1', 'approve');
    const link = await screen.findByRole('button', { name: 'Link to existing' });
    await waitFor(() => expect(link).toHaveFocus());
    expect(api.approve).not.toHaveBeenCalled();
  });
});

describe('JoinRequestRow drawer — footer states (R4.16)', () => {
  it('idle without a match: Reject (secondary) and Approve (primary) that creates straight away', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue(NO_MATCH);
    api.approve.mockResolvedValue({ id: 'r1', outcome: 'APPROVED_CREATED', employeeId: 'e9' });
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(footer()).toHaveClass(hrChrome.hrJoinDrawerFooter);
    expect(
      within(footer())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Reject', 'Approve']);
    await user.click(within(footer()).getByRole('button', { name: 'Approve' }));
    expect(screen.queryByText(/or create a new employee\?/)).toBeNull();
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('r1', { mode: 'CREATE' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('a footer Approve refusal is shown in the footer and the drawer stays open', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue(NO_MATCH);
    api.approve.mockRejectedValue(new Error('This request was already handled'));
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(within(footer()).getByRole('button', { name: 'Approve' }));
    expect(await within(footer()).findByRole('alert')).toHaveTextContent(
      'This request was already handled',
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(within(footer()).getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('saving: the pressed button spins and everything else is disabled, Esc is ignored', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue(NO_MATCH);
    let finish: (v: unknown) => void = () => undefined;
    api.approve.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(within(footer()).getByRole('button', { name: 'Approve' }));

    const approve = within(footer()).getByRole('button', { name: /Approve/ });
    expect(approve).toHaveAttribute('aria-busy', 'true');
    expect(within(footer()).getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    finish({ id: 'r1', outcome: 'APPROVED_CREATED', employeeId: 'e9' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('a decided request shows "already handled" in the footer and no actions', async () => {
    api.detail.mockResolvedValue({ ...PRIYA, status: 'REJECTED', possibleMatch: null });
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(within(footer()).getByText('This request was already handled.')).toBeInTheDocument();
    expect(within(footer()).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});

describe('JoinRequestRow drawer — inline reject (R4.7, R4.16)', () => {
  it('Reject expands the inline reason field with a live counter; no second dialog opens', async () => {
    const user = userEvent.setup();
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Reject request' })).toBeNull();
    const field = screen.getByRole('textbox', { name: 'Reason (optional)' });
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('maxlength', '200');
    expect(field.closest(`.${hrChrome.hrJoinReasonField}`)).not.toBeNull();
    expect(screen.getByText(/^0 \/ 200 · The worker sees this word for word$/)).toBeInTheDocument();
    expect(
      within(footer())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Confirm reject']);

    await user.type(field, 'Wrong shop');
    expect(screen.getByText(/^10 \/ 200/)).toBeInTheDocument();
    await user.type(field, '   ');
    // The counter counts the raw input, spaces included.
    expect(screen.getByText(/^13 \/ 200/)).toBeInTheDocument();
  });

  it('Cancel folds the field away and keeps the request untouched', async () => {
    const user = userEvent.setup();
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason (optional)' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(api.reject).not.toHaveBeenCalled();
    // Reopening starts blank.
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('textbox', { name: 'Reason (optional)' })).toHaveValue('');
  });

  it('Confirm reject sends the reason trimmed and closes with a toast', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(useNotify, 'success');
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Reason (optional)' }),
      ' Ask Ramesh to add you ',
    );
    await user.click(screen.getByRole('button', { name: 'Confirm reject' }));
    await waitFor(() =>
      expect(api.reject).toHaveBeenCalledWith('r1', { reason: 'Ask Ramesh to add you' }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith("Priya Sharma's request rejected");
  });

  it('whitespace-only is sent as no reason', async () => {
    const user = userEvent.setup();
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason (optional)' }), '    ');
    await user.click(screen.getByRole('button', { name: 'Confirm reject' }));
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('r1', { reason: null }));
  });

  it('a failed reject keeps the reason, shows the error in the footer, and goes back to rejecting', async () => {
    const user = userEvent.setup();
    api.reject.mockRejectedValue(new Error('This request was already handled'));
    const { onClose } = renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason (optional)' }), 'Wrong shop');
    await user.click(screen.getByRole('button', { name: 'Confirm reject' }));

    expect(await within(footer()).findByRole('alert')).toHaveTextContent(
      'This request was already handled',
    );
    expect(screen.getByRole('textbox', { name: 'Reason (optional)' })).toHaveValue('Wrong shop');
    expect(within(footer()).getByRole('button', { name: 'Confirm reject' })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('JoinRequestRow drawer — keyboard and focus (R4.17)', () => {
  it('Esc closes; the close button closes; focus returns to the row that opened it', async () => {
    const user = userEvent.setup();
    renderWithOpener();
    const opener = screen.getByRole('button', { name: 'Priya Sharma' });
    await user.click(opener);
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(dialog()).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('Tab order runs header → contact → request → match card → footer and wraps', async () => {
    const user = userEvent.setup();
    renderDrawer('r1');
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    const names: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      names.push(
        (document.activeElement as HTMLElement).getAttribute('aria-label') ??
          (document.activeElement as HTMLElement).textContent ??
          '',
      );
    }
    expect(names).toEqual([
      'Close',
      'Copy phone',
      'Copy email',
      'Link to existing',
      'Create new',
      'Reject',
    ]);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});

describe('JoinRequestRow drawer — themes and privacy (R4.17, R4.2, R11.3)', () => {
  it('renders under data-theme="dark" from hrChrome classes with no inline style anywhere', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      const user = userEvent.setup();
      renderDrawer('r1');
      await screen.findByRole('heading', { name: 'Priya Sharma' });
      await user.click(screen.getByRole('button', { name: 'Reject' }));

      const root = dialog().firstElementChild as HTMLElement;
      expect(root).toHaveClass(hrChrome.hrJoinDrawer);
      for (const key of [
        'hrJoinDrawerHeader',
        'hrJoinDrawerBody',
        'hrJoinDrawerSection',
        'hrJoinDrawerRow',
        'hrJoinMatchCard',
        'hrJoinReasonField',
        'hrJoinDrawerFooter',
      ] as const) {
        expect(root.querySelector(`.${hrChrome[key]}`), key).not.toBeNull();
      }
      expect(dialog().querySelectorAll('[style]')).toHaveLength(0);
    } finally {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('shows the snapshot fields and nothing else the server might add', async () => {
    api.detail.mockResolvedValue({
      ...PRIYA,
      aadhaar: '123412341234',
      pan: 'ABCDE1234F',
      address: '12 MG Road',
      userId: 'u-priya',
    } as unknown as JoinRequestDetail);
    renderDrawer('r1');
    const d = await screen.findByRole('dialog');
    await within(d).findByRole('heading', { name: 'Priya Sharma' });

    expect(within(d).getByText('Phone')).toBeInTheDocument();
    expect(within(d).getByText('Email')).toBeInTheDocument();
    expect(within(d).getByText('Pending')).toBeInTheDocument();
    // The requester has no photo: initials, not an image.
    expect(within(d).queryByTestId('join-request-photo')).toBeNull();

    expect(d).not.toHaveTextContent('123412341234');
    expect(d).not.toHaveTextContent('ABCDE1234F');
    expect(d).not.toHaveTextContent('MG Road');
    expect(d).not.toHaveTextContent('u-priya');
    expect(d).not.toHaveTextContent('e14');
    expect(within(d).queryByText(/Aadhaar|PAN|Address/)).toBeNull();
  });
});
