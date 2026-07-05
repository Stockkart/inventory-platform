import type { RouteModule } from '@inventory-platform/routing';

export const pricingRoutes: RouteModule = {
  path: 'pricing',
  children: [{ path: '', file: 'routes/pricing.tsx', lazy: () => import('./routes/pricing') }],
};

export const priceEditRoutes: RouteModule = {
  path: 'price-edit/:pricingId',
  children: [{ path: '', file: 'routes/price-edit.tsx', lazy: () => import('./routes/price-edit') }],
};

export const pricingDashboardRoutes: RouteModule[] = [pricingRoutes, priceEditRoutes];
