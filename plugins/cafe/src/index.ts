import type { VerticalPlugin } from '@inventory-platform/routing';
import { cafeNav } from './nav';

const cafePlugin: VerticalPlugin = {
  id: 'cafe',
  loadRoutes: () => import('./routes').then((m) => ({ default: m.cafeRoutes })),
  navContributions: [cafeNav],
  sellSurfaces: [
    {
      sellSurface: 'MENU_LIST',
      path: '/dashboard/menu-sell',
      load: () =>
        import('./pages/MenuSellPage').then((m) => ({
          default: m.MenuSellPage,
        })),
    },
  ],
};

export default cafePlugin;
export { cafeNav } from './nav';
export { MenuSellPage } from './pages/MenuSellPage';
export { MenuAdminPage } from './pages/MenuAdminPage';
export { ManualStockPage } from './pages/ManualStockPage';
/**
 * `/dashboard/cafe-kot`. Reachable only once the backend `CafeUiContributor` contributes its
 * nav entry — `cafeNav` above deliberately does not, because a frontend-contributed entry for
 * this screen is dropped by the nav merge.
 */
export { CafeKotPage } from './pages/CafeKotPage';
