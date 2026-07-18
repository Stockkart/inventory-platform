import type { RouteModule } from '@inventory-platform/routing';

export const productEntryRoutes: RouteModule = {
  path: 'product-entry',
  children: [
    {
      path: '',
      file: 'routes/product-entry.tsx',
      lazy: () => import('./routes/product-entry'),
    },
  ],
};

export const importRoutes: RouteModule = {
  path: 'import',
  children: [{ path: '', file: 'routes/import.tsx', lazy: () => import('./routes/import') }],
};

export const productSearchRoutes: RouteModule = {
  path: 'product-search',
  children: [
    { path: '', file: 'routes/product-search.tsx', lazy: () => import('./routes/product-search') },
  ],
};

export const stockCorrectionsRoutes: RouteModule = {
  path: 'stock-corrections',
  children: [
    {
      path: '',
      file: 'routes/stock-corrections.tsx',
      lazy: () => import('./routes/stock-corrections'),
    },
  ],
};

export const vendorInvoicesRoutes: RouteModule = {
  path: 'vendor-invoices',
  children: [
    {
      path: '',
      file: 'routes/vendor-invoices.tsx',
      lazy: () => import('./routes/vendor-invoices'),
    },
  ],
};

export const scanSellRoutes: RouteModule = {
  path: 'scan-sell',
  children: [{ path: '', file: 'routes/scan-sell.tsx', lazy: () => import('./routes/scan-sell') }],
};

export const checkoutRoutes: RouteModule = {
  path: 'checkout',
  children: [{ path: '', file: 'routes/checkout.tsx', lazy: () => import('./routes/checkout') }],
};

export const historyRoutes: RouteModule = {
  path: 'history',
  children: [{ path: '', file: 'routes/history.tsx', lazy: () => import('./routes/history') }],
};

export const refundRoutes: RouteModule = {
  path: 'refund',
  children: [{ path: '', file: 'routes/refund.tsx', lazy: () => import('./routes/refund') }],
};

export const vendorReturnRoutes: RouteModule = {
  path: 'vendor-return',
  children: [
    { path: '', file: 'routes/vendor-return.tsx', lazy: () => import('./routes/vendor-return') },
  ],
};

export const mobileUploadRoutes: RouteModule = {
  path: 'm/upload',
  children: [
    { path: '', file: 'routes/mobile-upload.tsx', lazy: () => import('./routes/mobile-upload') },
  ],
};

export const productDashboardRoutes: RouteModule[] = [
  productEntryRoutes,
  importRoutes,
  productSearchRoutes,
  stockCorrectionsRoutes,
  vendorInvoicesRoutes,
  scanSellRoutes,
  checkoutRoutes,
  historyRoutes,
  refundRoutes,
  vendorReturnRoutes,
];
