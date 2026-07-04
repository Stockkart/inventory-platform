import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the accounting domain. */
export const accountingNav: NavContribution = {
  groupId: 'accounting',
  label: 'Accounting',
  icon: '📒',
  requiredCapability: 'accounting',
  items: [
    { path: '/dashboard/accounting', label: 'Overview', icon: '📊' },
    { path: '/dashboard/accounting/journal', label: 'Journal', icon: '📝' },
    { path: '/dashboard/accounting/ledger', label: 'Ledger', icon: '📒' },
    { path: '/dashboard/accounting/vendors', label: 'Vendors', icon: '🏭' },
    { path: '/dashboard/accounting/customers', label: 'Customers', icon: '👥' },
    { path: '/dashboard/accounting/trial-balance', label: 'Trial Balance', icon: '⚖️' },
    {
      path: '/dashboard/accounting/chart-of-accounts',
      label: 'Chart of Accounts',
      icon: '📋',
    },
  ],
};
