import type { RouteModule } from '@inventory-platform/routing';

export const menuSellRoutes: RouteModule = {
  path: 'menu-sell',
  children: [{ path: '', file: 'routes/menu-sell.tsx', lazy: () => import('./routes/menu-sell') }],
};

export const menuAdminRoutes: RouteModule = {
  path: 'menu',
  children: [{ path: '', file: 'routes/menu.tsx', lazy: () => import('./routes/menu') }],
};

export const manualStockRoutes: RouteModule = {
  path: 'manual-stock',
  children: [
    { path: '', file: 'routes/manual-stock.tsx', lazy: () => import('./routes/manual-stock') },
  ],
};

export const cafeRoutes: RouteModule[] = [menuSellRoutes, menuAdminRoutes, manualStockRoutes];
