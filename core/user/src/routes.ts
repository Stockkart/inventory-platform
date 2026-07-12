import type { RouteModule } from '@inventory-platform/routing';

export const customersRoutes: RouteModule = {
  path: 'customers',
  children: [{ path: '', file: 'routes/customers.tsx', lazy: () => import('./routes/customers') }],
};

export const vendorsRoutes: RouteModule = {
  path: 'vendors',
  children: [{ path: '', file: 'routes/vendors.tsx', lazy: () => import('./routes/vendors') }],
};

export const invitationsRoutes: RouteModule = {
  path: 'invitations',
  children: [
    { path: '', file: 'routes/invitations.tsx', lazy: () => import('./routes/invitations') },
  ],
};

export const myInvitationsRoutes: RouteModule = {
  path: 'my-invitations',
  children: [
    { path: '', file: 'routes/my-invitations.tsx', lazy: () => import('./routes/my-invitations') },
  ],
};

export const shopUsersRoutes: RouteModule = {
  path: 'shop-users',
  children: [
    { path: '', file: 'routes/shop-users.tsx', lazy: () => import('./routes/shop-users') },
  ],
};

export const accessControlRoutes: RouteModule = {
  path: 'access-control',
  children: [
    { path: '', file: 'routes/access-control.tsx', lazy: () => import('./routes/access-control') },
  ],
};

export const shopsRoutes: RouteModule = {
  path: 'shops',
  children: [{ path: '', file: 'routes/shops.tsx', lazy: () => import('./routes/shops') }],
};

export const profileRoutes: RouteModule = {
  path: 'profile',
  children: [{ path: '', file: 'routes/profile.tsx', lazy: () => import('./routes/profile') }],
};

export const joinRequestsRoutes: RouteModule = {
  path: 'join-requests',
  children: [
    { path: '', file: 'routes/join-requests.tsx', lazy: () => import('./routes/join-requests') },
  ],
};

export const whatsAppMarketingRoutes: RouteModule = {
  path: 'whatsapp-marketing',
  children: [
    {
      path: '',
      file: 'routes/whatsapp-marketing.tsx',
      lazy: () => import('./routes/whatsapp-marketing'),
    },
  ],
};

export const userDashboardRoutes: RouteModule[] = [
  shopsRoutes,
  profileRoutes,
  customersRoutes,
  vendorsRoutes,
  invitationsRoutes,
  myInvitationsRoutes,
  shopUsersRoutes,
  accessControlRoutes,
  joinRequestsRoutes,
  whatsAppMarketingRoutes,
];
