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
 * The kitchen-order screen.
 *
 * Reaching it needs **both** layers, and it is easy to get wrong in either direction:
 * `CafeUiContributor` on the backend *enables* the path, and `nav.ts` here *supplies* the
 * item. `capabilityNav.pluginNavItemsForCapabilities` walks this plugin's own contributions
 * and keeps only those whose path the API enabled — so an entry present in one layer and
 * missing from the other yields no sidebar link and a screen nobody can open. `nav.spec.ts`
 * pins the pairing.
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
