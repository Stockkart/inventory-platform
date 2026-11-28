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

export const planDashboardRoutes: RouteModule[] = [
  planPaymentRoutes,
  planStatusRoutes,
  referralRoutes,
];
