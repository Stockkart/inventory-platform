import type { RouteModule } from '@inventory-platform/routing';

/** Accounting route tree for the inventory app shell. */
export const accountingRoutes: RouteModule = {
  path: 'accounting',
  children: [
    { path: '', lazy: () => import('./routes/overview') },
    { path: 'journal', lazy: () => import('./routes/journal') },
    { path: 'journal/new', lazy: () => import('./routes/journal-new') },
    { path: 'journal/:entryId', lazy: () => import('./routes/journal-detail') },
    { path: 'ledger', lazy: () => import('./routes/ledger') },
    { path: 'ledger/:accountId', lazy: () => import('./routes/ledger-account') },
    { path: 'vendors', lazy: () => import('./routes/vendors') },
    { path: 'vendors/:partyRefId', lazy: () => import('./routes/vendor-statement') },
    { path: 'customers', lazy: () => import('./routes/customers') },
    { path: 'customers/:partyRefId', lazy: () => import('./routes/customer-statement') },
    { path: 'trial-balance', lazy: () => import('./routes/trial-balance') },
    { path: 'chart-of-accounts', lazy: () => import('./routes/chart-of-accounts') },
    { path: 'opening-balances', lazy: () => import('./routes/opening-balances') },
    { path: 'reports/profit-and-loss', lazy: () => import('./routes/profit-and-loss') },
    { path: 'reports/balance-sheet', lazy: () => import('./routes/balance-sheet') },
  ],
};
