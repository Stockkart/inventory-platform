import type { RouteModule } from '@inventory-platform/routing';

export const pricingRoutes: RouteModule = {
  path: 'pricing',
  children: [{ path: '', lazy: () => import('./routes/pricing') }],
};

export const priceEditRoutes: RouteModule = {
  path: 'price-edit/:pricingId',
  children: [{ path: '', lazy: () => import('./routes/price-edit') }],
};
