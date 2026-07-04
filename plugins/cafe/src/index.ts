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
