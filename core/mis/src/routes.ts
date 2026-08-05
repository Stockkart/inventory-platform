import type { RouteModule } from '@inventory-platform/routing';

/** MIS route tree for the inventory app shell. */
export const misRoutes: RouteModule = {
  path: 'mis',
  children: [
    {
      path: 'vendor-money',
      file: 'routes/vendor-money.tsx',
      lazy: () => import('./routes/vendor-money'),
    },
    {
      path: 'customer-money',
      file: 'routes/customer-money.tsx',
      lazy: () => import('./routes/customer-money'),
    },
    {
      path: 'sales',
      file: 'routes/sales.tsx',
      lazy: () => import('./routes/sales'),
    },
    {
      path: 'stock',
      file: 'routes/stock.tsx',
      lazy: () => import('./routes/stock'),
    },
  ],
};

export const misDashboardRoutes: RouteModule[] = [misRoutes];
