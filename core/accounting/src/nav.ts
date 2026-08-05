import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the accounting domain. */
export const accountingNav: NavContribution = {
  groupId: 'accounting',
  label: 'Accounting',
  icon: 'book-open',
  requiredCapability: 'accounting',
  items: [
    { path: '/dashboard/accounting', label: 'Overview', icon: 'layout-dashboard' },
    { path: '/dashboard/accounting/journal', label: 'Journal', icon: 'pencil-line' },
    { path: '/dashboard/accounting/ledger', label: 'Ledger', icon: 'book-open' },
    { path: '/dashboard/accounting/vendors', label: 'Vendors', icon: 'factory' },
    { path: '/dashboard/accounting/customers', label: 'Customers', icon: 'users' },
    { path: '/dashboard/accounting/trial-balance', label: 'Trial Balance', icon: 'scale' },
    {
      path: '/dashboard/accounting/chart-of-accounts',
      label: 'Chart of Accounts',
      icon: 'clipboard-list',
    },
  ],
};
