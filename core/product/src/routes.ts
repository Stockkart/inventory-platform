import type { RouteModule } from '@inventory-platform/routing';

export const productRegistrationRoutes: RouteModule = {
  path: 'product-registration',
  children: [{ path: '', lazy: () => import('./routes/product-registration') }],
};

export const importRoutes: RouteModule = {
  path: 'import',
  children: [{ path: '', lazy: () => import('./routes/import') }],
};

export const productSearchRoutes: RouteModule = {
  path: 'product-search',
  children: [{ path: '', lazy: () => import('./routes/product-search') }],
};

export const stockCorrectionsRoutes: RouteModule = {
  path: 'stock-corrections',
  children: [{ path: '', lazy: () => import('./routes/stock-corrections') }],
};

export const vendorInvoicesRoutes: RouteModule = {
  path: 'vendor-invoices',
  children: [{ path: '', lazy: () => import('./routes/vendor-invoices') }],
};

export const scanSellRoutes: RouteModule = {
  path: 'scan-sell',
  children: [{ path: '', lazy: () => import('./routes/scan-sell') }],
};

export const menuSellRoutes: RouteModule = {
  path: 'menu-sell',
  children: [{ path: '', lazy: () => import('./routes/menu-sell') }],
};

export const menuAdminRoutes: RouteModule = {
  path: 'menu',
  children: [{ path: '', lazy: () => import('./routes/menu') }],
};

export const manualStockRoutes: RouteModule = {
  path: 'manual-stock',
  children: [{ path: '', lazy: () => import('./routes/manual-stock') }],
};

export const checkoutRoutes: RouteModule = {
  path: 'checkout',
  children: [{ path: '', lazy: () => import('./routes/checkout') }],
};
