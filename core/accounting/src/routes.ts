import type { RouteModule } from '@inventory-platform/routing';

/** Accounting route tree for the inventory app shell. */
export const accountingRoutes: RouteModule = {
  path: 'accounting',
  children: [
    { path: '', file: 'routes/overview.tsx', lazy: () => import('./routes/overview') },
    { path: 'journal', file: 'routes/journal.tsx', lazy: () => import('./routes/journal') },
    {
      path: 'journal/new',
      file: 'routes/journal-new.tsx',
      lazy: () => import('./routes/journal-new'),
    },
    {
      path: 'journal/:entryId',
      file: 'routes/journal-detail.tsx',
      lazy: () => import('./routes/journal-detail'),
    },
    { path: 'ledger', file: 'routes/ledger.tsx', lazy: () => import('./routes/ledger') },
    {
      path: 'ledger/:accountId',
      file: 'routes/ledger-account.tsx',
      lazy: () => import('./routes/ledger-account'),
    },
    { path: 'vendors', file: 'routes/vendors.tsx', lazy: () => import('./routes/vendors') },
    {
      path: 'vendors/:partyRefId',
      file: 'routes/vendor-statement.tsx',
      lazy: () => import('./routes/vendor-statement'),
    },
    { path: 'customers', file: 'routes/customers.tsx', lazy: () => import('./routes/customers') },
    {
      path: 'customers/:partyRefId',
      file: 'routes/customer-statement.tsx',
      lazy: () => import('./routes/customer-statement'),
    },
    {
      path: 'trial-balance',
      file: 'routes/trial-balance.tsx',
      lazy: () => import('./routes/trial-balance'),
    },
    {
      path: 'chart-of-accounts',
      file: 'routes/chart-of-accounts.tsx',
      lazy: () => import('./routes/chart-of-accounts'),
    },
    {
      path: 'opening-balances',
      file: 'routes/opening-balances.tsx',
      lazy: () => import('./routes/opening-balances'),
    },
    {
      path: 'reports/profit-and-loss',
      file: 'routes/profit-and-loss.tsx',
      lazy: () => import('./routes/profit-and-loss'),
    },
    {
      path: 'reports/balance-sheet',
      file: 'routes/balance-sheet.tsx',
      lazy: () => import('./routes/balance-sheet'),
    },
    {
      path: 'reports/vendor-money-mis',
      file: 'routes/vendor-money-mis.tsx',
      lazy: () => import('./routes/vendor-money-mis'),
    },
  ],
};
