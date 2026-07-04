import type { RouteModule } from '@inventory-platform/routing';

export const planStatusRoutes: RouteModule = {
  path: 'plan-status',
  children: [{ path: '', lazy: () => import('./routes/plan-status') }],
};

export const planPaymentRoutes: RouteModule = {
  path: 'plan-payment',
  children: [{ path: '', lazy: () => import('./routes/plan-payment') }],
};

export const paymentBillingRoutes: RouteModule = {
  path: 'payment-billing',
  children: [{ path: '', lazy: () => import('./routes/payment-billing') }],
};
