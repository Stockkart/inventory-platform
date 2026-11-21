// Run F5 (task 21): the HR inbox polls `/me/notifications?since=` every 60 s and on focus,
// keeps the cursor, and marks rows read.
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import { Text } from '@inventory-platform/ui-kit';
import type { HrNotificationResponse } from '@inventory-platform/hr/types';
import { HR_INBOX_POLL_MS } from '../queries/hooks';
import { HrInbox } from './HrInbox';

const meApi = vi.hoisted(() => ({
  notifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('../api/me.api', () => ({ meApi }));

const SHOP = 'shop-1';

function signIn(permissions: HrPermission[], employeeId: string | null) {
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

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/employees', element: <HrInbox /> },
      { path: '/dashboard/hr/leave', element: <Text>Leave page</Text> },
    ],
    { initialEntries: ['/dashboard/hr/employees'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const T1 = '2026-10-06T09:00:00Z';
const T2 = '2026-10-06T09:01:30Z';
const REQUESTED: HrNotificationResponse = {
  id: 'n1',
  type: 'LEAVE_REQUESTED',
  leaveRequestId: 'r1',
  text: 'Asha asked for leave on 8 Oct',
  createdAt: T1,
  read: false,
};
const LATER: HrNotificationResponse = {
  ...REQUESTED,
  id: 'n2',
  leaveRequestId: 'r2',
  text: 'Ravi asked for leave on 9 Oct',
  createdAt: T2,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  meApi.markAllNotificationsRead.mockResolvedValue(2);
  meApi.markNotificationRead.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  focusManager.setFocused(undefined);
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('HrInbox', () => {
  it('polls every 60 s and on focus from the last cursor, then reads all', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE'], null);
    meApi.notifications
      .mockResolvedValueOnce({ items: [REQUESTED], cursor: T1 })
      .mockResolvedValueOnce({ items: [LATER], cursor: T2 })
      .mockResolvedValue({ items: [], cursor: T2 });
    renderInbox();

    expect(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    ).toBeInTheDocument();
    expect(meApi.notifications).toHaveBeenNthCalledWith(1, null);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HR_INBOX_POLL_MS);
    });
    expect(
      await screen.findByRole('button', { name: 'Notifications, 2 unread' }),
    ).toBeInTheDocument();
    // The second poll asks only for rows newer than the first poll's cursor.
    expect(meApi.notifications).toHaveBeenNthCalledWith(2, T1);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(meApi.notifications).toHaveBeenNthCalledWith(3, T2));

    await user.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }));
    const drawer = await screen.findByRole('dialog', { name: 'Notifications' });
    const list = within(drawer).getByRole('list', { name: 'HR notifications' });
    // Newest first.
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Ravi asked for leave');
    await user.click(within(drawer).getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(meApi.markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole('button', { name: 'Notifications, none unread' }),
    ).toBeInTheDocument();
    expect(within(drawer).queryByText('New')).toBeNull();
  });

  it('takes an approver to the leave requests and marks the row read', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    signIn(['VIEW_ATTENDANCE', 'APPROVE_LEAVE'], null);
    meApi.notifications.mockResolvedValue({ items: [REQUESTED], cursor: T1 });
    const router = renderInbox();

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    await user.click(screen.getByRole('button', { name: 'Open leave requests' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/hr/leave'));
    expect(meApi.markNotificationRead).toHaveBeenCalledWith('n1');
  });

  it('does not poll for members who neither approve leave nor are linked', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE'], null);
    renderInbox();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HR_INBOX_POLL_MS);
    });
    expect(screen.queryByRole('button', { name: /^Notifications/ })).toBeNull();
    expect(meApi.notifications).not.toHaveBeenCalled();
  });
});
