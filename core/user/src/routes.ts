import type { RouteModule } from '@inventory-platform/routing';

export const customersRoutes: RouteModule = {
  path: 'customers',
  children: [{ path: '', lazy: () => import('./routes/customers') }],
};

export const vendorsRoutes: RouteModule = {
  path: 'vendors',
  children: [{ path: '', lazy: () => import('./routes/vendors') }],
};

export const invitationsRoutes: RouteModule = {
  path: 'invitations',
  children: [{ path: '', lazy: () => import('./routes/invitations') }],
};

export const myInvitationsRoutes: RouteModule = {
  path: 'my-invitations',
  children: [{ path: '', lazy: () => import('./routes/my-invitations') }],
};

export const shopUsersRoutes: RouteModule = {
  path: 'shop-users',
  children: [{ path: '', lazy: () => import('./routes/shop-users') }],
};

export const accessControlRoutes: RouteModule = {
  path: 'access-control',
  children: [{ path: '', lazy: () => import('./routes/access-control') }],
};
