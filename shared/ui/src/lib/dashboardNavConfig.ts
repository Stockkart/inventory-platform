import type { BusinessProfile } from '@inventory-platform/types';

export type DashboardMenuItem = {
  path: string;
  label: string;
  icon: string;
};

export type DashboardMenuGroup = {
  id: string;
  label: string;
  icon: string;
  items: DashboardMenuItem[];
};

export const DASHBOARD_MENU_GROUPS: DashboardMenuGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/dashboard/shops', label: 'Shops', icon: '🏪' },
      { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
    ],
  },
  {
    id: 'products',
    label: 'Products & Sales',
    icon: '📦',
    items: [
      {
        path: '/dashboard/product-registration',
        label: 'Product Registration',
        icon: '📦',
      },
      {
        path: '/dashboard/product-search',
        label: 'Product Search',
        icon: '🔍',
      },
      { path: '/dashboard/pricing', label: 'Pricing', icon: '💰' },
      { path: '/dashboard/scan-sell', label: 'Scan and Sell', icon: '📱' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: '📇',
    items: [
      { path: '/dashboard/customers', label: 'Customer', icon: '👥' },
      { path: '/dashboard/vendors', label: 'Vendor', icon: '🚚' },
    ],
  },
  {
    id: 'credit',
    label: 'Credit',
    icon: '🤝',
    items: [
      { path: '/dashboard/credit', label: 'Credit balances', icon: '🤝' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: '📚',
    items: [
      { path: '/dashboard/accounting', label: 'Overview', icon: '📊' },
      {
        path: '/dashboard/accounting/journal',
        label: 'Journal Entries',
        icon: '📝',
      },
      { path: '/dashboard/accounting/ledger', label: 'Ledger', icon: '📒' },
      {
        path: '/dashboard/accounting/vendors',
        label: 'Vendors',
        icon: '🚚',
      },
      {
        path: '/dashboard/accounting/customers',
        label: 'Customers',
        icon: '🧾',
      },
      {
        path: '/dashboard/accounting/trial-balance',
        label: 'Trial Balance',
        icon: '⚖️',
      },
      {
        path: '/dashboard/accounting/chart-of-accounts',
        label: 'Chart of Accounts',
        icon: '🗂️',
      },
    ],
  },
  {
    id: 'returns',
    label: 'Returns',
    icon: '↩️',
    items: [
      {
        path: '/dashboard/refund',
        label: 'Return to customer',
        icon: '↩️',
      },
      {
        path: '/dashboard/vendor-return',
        label: 'Return to vendor',
        icon: '📤',
      },
    ],
  },
  {
    id: 'analytics-history',
    label: 'Reports & Analytics',
    icon: '📈',
    items: [
      {
        path: '/dashboard/analytics',
        label: 'Analytics Dashboard',
        icon: '📈',
      },
      { path: '/dashboard/taxes', label: 'Taxes', icon: '📋' },
      { path: '/dashboard/history', label: 'History', icon: '📜' },
      {
        path: '/dashboard/stock-corrections',
        label: 'Stock corrections',
        icon: '🛠️',
      },
    ],
  },
  {
    id: 'reminders-alerts',
    label: 'Reminders & Alerts',
    icon: '🔔',
    items: [
      { path: '/dashboard/reminders', label: 'Reminder', icon: '📅' },
      {
        path: '/dashboard/inventory-alert',
        label: 'Inventory Low Alert',
        icon: '🔔',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📣',
    items: [
      {
        path: '/dashboard/whatsapp-marketing',
        label: 'WhatsApp Marketing',
        icon: '💬',
      },
    ],
  },
  {
    id: 'team',
    label: 'Team & Collaboration',
    icon: '👥',
    items: [
      { path: '/dashboard/invitations', label: 'Invitations', icon: '✉️' },
      {
        path: '/dashboard/my-invitations',
        label: 'My Invitations',
        icon: '📬',
      },
      { path: '/dashboard/join-requests', label: 'Join Requests', icon: '🤝' },
      { path: '/dashboard/shop-users', label: 'Shop Users', icon: '👥' },
    ],
  },
  {
    id: 'payment-plan',
    label: 'Payment & Plan',
    icon: '💳',
    items: [
      { path: '/dashboard/plan-payment', label: 'Payment', icon: '💳' },
      { path: '/dashboard/plan-status', label: 'My Plan', icon: '📋' },
    ],
  },
];

/** Dashboard paths gated by `modules.*` flags on the business profile. */
export const MODULE_NAV_PATHS: Record<string, string[]> = {
  gstrReports: ['/dashboard/taxes'],
  expiryReminders: ['/dashboard/reminders'],
  customReminders: ['/dashboard/reminders'],
  accounting: [
    '/dashboard/accounting',
    '/dashboard/accounting/journal',
    '/dashboard/accounting/ledger',
    '/dashboard/accounting/vendors',
    '/dashboard/accounting/customers',
    '/dashboard/accounting/trial-balance',
    '/dashboard/accounting/chart-of-accounts',
  ],
  credit: ['/dashboard/credit'],
  whatsappMarketing: ['/dashboard/whatsapp-marketing'],
  lowStockAlerts: ['/dashboard/inventory-alert'],
  stockCorrections: ['/dashboard/stock-corrections'],
};

export const CASHIER_HIDDEN_DASHBOARD_PATHS = [
  '/dashboard/shop-users',
  '/dashboard/invitations',
  '/dashboard/join-requests',
  '/dashboard/accounting',
  '/dashboard/accounting/journal',
  '/dashboard/accounting/ledger',
  '/dashboard/accounting/vendors',
  '/dashboard/accounting/customers',
  '/dashboard/accounting/trial-balance',
  '/dashboard/accounting/chart-of-accounts',
];

export type DashboardNavRow = DashboardMenuItem & { groupLabel: string };

function isPathAllowedByProfile(path: string, profile: BusinessProfile | null | undefined): boolean {
  if (!profile) {
    return true;
  }
  const navHidden = profile.ui?.navHidden ?? [];
  if (navHidden.includes(path)) {
    return false;
  }
  for (const [moduleKey, paths] of Object.entries(MODULE_NAV_PATHS)) {
    if (paths.includes(path) && !profile.modules[moduleKey]) {
      return false;
    }
  }
  return true;
}

function filterMenuItems(
  items: DashboardMenuItem[],
  role: string | undefined,
  profile: BusinessProfile | null | undefined
): DashboardMenuItem[] {
  const isCashier = role === 'CASHIER';
  return items.filter((item) => {
    if (isCashier && CASHIER_HIDDEN_DASHBOARD_PATHS.includes(item.path)) {
      return false;
    }
    return isPathAllowedByProfile(item.path, profile);
  });
}

/** Sidebar groups for role + optional business profile (modules / navHidden). */
export function getDashboardMenuGroupsForRole(
  role: string | undefined,
  profile?: BusinessProfile | null
): DashboardMenuGroup[] {
  return DASHBOARD_MENU_GROUPS.map((group) => ({
    ...group,
    items: filterMenuItems(group.items, role, profile),
  })).filter((group) => group.items.length > 0);
}

/** Flattened nav for role + optional business profile. */
export function getDashboardNavRowsForRole(
  role: string | undefined,
  profile?: BusinessProfile | null
): DashboardNavRow[] {
  const rows: DashboardNavRow[] = [];
  for (const group of getDashboardMenuGroupsForRole(role, profile)) {
    for (const item of group.items) {
      rows.push({ ...item, groupLabel: group.label });
    }
  }
  return rows;
}
