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

/**
 * The kitchen-order screen. Its **nav entry is contributed by the backend**
 * `CafeUiContributor`, not by `nav.ts` here — a nav item added in this layer does not reach
 * the sidebar and leaves the route unreachable. Registering the route is all the frontend owes.
 */
export const cafeKotRoutes: RouteModule = {
  path: 'cafe-kot',
  children: [{ path: '', file: 'routes/cafe-kot.tsx', lazy: () => import('./routes/cafe-kot') }],
};

export const cafeRoutes: RouteModule[] = [
  menuSellRoutes,
  menuAdminRoutes,
  manualStockRoutes,
  cafeKotRoutes,
];
