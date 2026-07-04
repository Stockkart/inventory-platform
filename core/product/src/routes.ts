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

export const checkoutRoutes: RouteModule = {
  path: 'checkout',
  children: [{ path: '', lazy: () => import('./routes/checkout') }],
};

export const historyRoutes: RouteModule = {
  path: 'history',
  children: [{ path: '', lazy: () => import('./routes/history') }],
};

export const refundRoutes: RouteModule = {
  path: 'refund',
  children: [{ path: '', lazy: () => import('./routes/refund') }],
};

export const vendorReturnRoutes: RouteModule = {
  path: 'vendor-return',
  children: [{ path: '', lazy: () => import('./routes/vendor-return') }],
};
