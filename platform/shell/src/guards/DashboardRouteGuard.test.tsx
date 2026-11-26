// Feature: worker-app, R2.1, R2.2: a WORKER login is taken straight to My HR; with no shop or
// no linked employee it sees the "not part of a shop yet" page and nothing else.
import { render, screen, waitFor } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShopAccess } from '@inventory-platform/access';
import { Text } from '@inventory-platform/ui-kit';
import {
  useAuthStore,
  usePlanStatusStore,
  useShopAccessStore,
  useVerticalSchemaStore,
} from '@inventory-platform/session';
import { NOT_IN_SHOP_MESSAGE } from '../lib/NotInShopPage';
import { DashboardRouteGuard } from './DashboardRouteGuard';

vi.mock('@inventory-platform/api-client', () => ({
  apiClient: {
    setToken: vi.fn(),
    setShopId: vi.fn(),
    getShopId: vi.fn(() => 'shop-1'),
    setPlanExpiredHandler: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const SHOP = 'shop-1';

function access(role: string, employeeId: string | null): ShopAccess {
  return {
    role,
    relationship: 'INVITED',
    owner: false,
    canManageAccess: false,
    productSearch: {
      canView: true,
      canEdit: false,
      editMode: 'FULL_EDIT',
      canEditAll: false,
      editableFields: [],
    },
    stockCorrection: { canCreate: false, canApprove: false },
    modules: {
      accounting: false,
      analytics: false,
      mis: false,
      taxes: false,
      stockCorrection: false,
      marketing: false,
      paymentPlan: false,
      productSearchEdit: false,
      rateRulesEdit: false,
      hr: role !== 'WORKER',
    },
    team: {
      manageInvitations: false,
      manageJoinRequests: false,
      manageShopUsers: false,
      viewMyInvitations: true,
    },
    hr: { permissions: [], employeeId },
  };
}

function signIn(role: string, shopId: string | null) {
  useAuthStore.setState({
    user: { userId: 'u1', role, shopId },
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
    fetchCurrentUser: vi.fn(async () => undefined),
  } as never);
  usePlanStatusStore.setState({
    byShopId: {},
    loading: false,
    fetchPlanStatus: vi.fn(async () => null),
  } as never);
  useVerticalSchemaStore.setState({ fetchShopSchema: vi.fn(async () => null) } as never);
}

function accessLoaded(a: ShopAccess | null, error: string | null = null) {
  useShopAccessStore.setState({
    byShopId: a ? { [SHOP]: a } : {},
    loading: false,
    error,
    fetchAccess: vi.fn(async () => a),
  } as never);
}

function Probe() {
  const location = useLocation();
  return <Text>dashboard at {location.pathname}</Text>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: (
          <DashboardRouteGuard>
            <Outlet />
          </DashboardRouteGuard>
        ),
        children: [
          { index: true, element: <Probe /> },
          { path: '*', element: <Probe /> },
        ],
      },
      { path: '/login', element: <Text>login page</Text> },
      { path: '/shop-selection', element: <Text>shop selection</Text> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('DashboardRouteGuard for a WORKER login', () => {
  beforeEach(() => {
    useShopAccessStore.setState({ byShopId: {}, loading: false, error: null });
  });

  it('sends a linked worker from the dashboard home straight to My HR', async () => {
    signIn('WORKER', SHOP);
    accessLoaded(access('WORKER', 'emp-1'));
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/hr/me'));
    expect(await screen.findByText('dashboard at /dashboard/hr/me')).toBeInTheDocument();
    expect(screen.queryByText(NOT_IN_SHOP_MESSAGE)).not.toBeInTheDocument();
  });

  it('sends a worker who typed a staff URL to My HR', async () => {
    signIn('WORKER', SHOP);
    accessLoaded(access('WORKER', 'emp-1'));
    const router = renderAt('/dashboard/hr/employees');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/hr/me'));
    expect(screen.queryByText('dashboard at /dashboard/hr/employees')).not.toBeInTheDocument();
  });

  it('shows the not-in-shop page, and nothing else, when the worker has no linked employee', async () => {
    signIn('WORKER', SHOP);
    accessLoaded(access('WORKER', null));
    renderAt('/dashboard/hr/me');
    expect(await screen.findByText(NOT_IN_SHOP_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard at/)).not.toBeInTheDocument();
  });

  it('shows the not-in-shop page when the worker has no shop, instead of shop selection', async () => {
    signIn('WORKER', null);
    accessLoaded(null);
    const router = renderAt('/dashboard');
    expect(await screen.findByText(NOT_IN_SHOP_MESSAGE)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/hr/me'));
    expect(screen.queryByText('shop selection')).not.toBeInTheDocument();
  });

  it('shows the not-in-shop page when /shops/me/access failed', async () => {
    signIn('WORKER', SHOP);
    accessLoaded(null, 'Failed to load shop access');
    renderAt('/dashboard/hr/me');
    expect(await screen.findByText(NOT_IN_SHOP_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard at/)).not.toBeInTheDocument();
  });
});

describe('DashboardRouteGuard for staff logins (unchanged)', () => {
  it('still sends a staff login with no shop to shop selection', async () => {
    signIn('MANAGER', null);
    accessLoaded(null);
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/shop-selection'));
    expect(screen.queryByText(NOT_IN_SHOP_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders the dashboard for a staff login on an allowed page', async () => {
    signIn('MANAGER', SHOP);
    accessLoaded(access('MANAGER', null));
    const router = renderAt('/dashboard/products');
    expect(await screen.findByText('dashboard at /dashboard/products')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/products');
  });
});
