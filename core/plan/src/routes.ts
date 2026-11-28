import type { RouteModule } from '@inventory-platform/routing';

export const planStatusRoutes: RouteModule = {
  path: 'plan-status',
  children: [
    { path: '', file: 'routes/plan-status.tsx', lazy: () => import('./routes/plan-status') },
  ],
};

export const planPaymentRoutes: RouteModule = {
  path: 'plan-payment',
  children: [
    { path: '', file: 'routes/plan-payment.tsx', lazy: () => import('./routes/plan-payment') },
  ],
};

export const referralRoutes: RouteModule = {
  path: 'referrals',
  children: [{ path: '', file: 'routes/referrals.tsx', lazy: () => import('./routes/referrals') }],
};

/** StockKart operators only; the shell hides and guards these for everyone else. */
export const platformAdminRoutes: RouteModule = {
  path: 'platform-admin',
  children: [
    {
      path: 'mis',
      file: 'routes/platform-admin-mis.tsx',
      lazy: () => import('./routes/platform-admin-mis'),
    },
    {
      path: 'referrals',
      file: 'routes/platform-admin-referrals.tsx',
      lazy: () => import('./routes/platform-admin-referrals'),
    },
    {
      path: 'vouchers',
      file: 'routes/platform-admin-vouchers.tsx',
      lazy: () => import('./routes/platform-admin-vouchers'),
    },
    {
      path: 'campaigns',
      file: 'routes/platform-admin-campaigns.tsx',
      lazy: () => import('./routes/platform-admin-campaigns'),
    },
  ],
};

export const planDashboardRoutes: RouteModule[] = [
  planPaymentRoutes,
  planStatusRoutes,
  referralRoutes,
  platformAdminRoutes,
];
