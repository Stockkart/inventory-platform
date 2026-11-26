// Feature: worker-app, R2.2: a WORKER login with no shop sees one sentence and nothing else.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@inventory-platform/session';
import { Text } from '@inventory-platform/ui-kit';
import { NOT_IN_SHOP_MESSAGE, NotInShopPage } from './NotInShopPage';

vi.mock('@inventory-platform/api-client', () => ({
  apiClient: {
    setToken: vi.fn(),
    setShopId: vi.fn(),
    getShopId: vi.fn(() => null),
    setPlanExpiredHandler: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/me', element: <NotInShopPage /> },
      { path: '/login', element: <Text>login page</Text> },
    ],
    { initialEntries: ['/dashboard/hr/me'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('NotInShopPage', () => {
  const logout = vi.fn(async () => undefined);

  beforeEach(() => {
    logout.mockClear();
    useAuthStore.setState({
      user: { userId: 'u1', role: 'WORKER', shopId: null },
      isAuthenticated: true,
      logout,
    } as never);
  });

  it('shows the exact sentence and no shop content', () => {
    renderPage();
    expect(screen.getByText(NOT_IN_SHOP_MESSAGE)).toBeInTheDocument();
    expect(NOT_IN_SHOP_MESSAGE).toBe(
      'Your account is not part of a shop yet. Ask to join from the Stockkart Team app.',
    );
    // The only control is signing out: no navigation, no links into the dashboard.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('signs out and goes to the login page', async () => {
    const user = userEvent.setup();
    const router = renderPage();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
