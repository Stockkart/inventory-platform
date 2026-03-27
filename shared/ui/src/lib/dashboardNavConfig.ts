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
      { path: '/dashboard/refund', label: 'Refund', icon: '↩️' },
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
    ],
  },
  {
    id: 'credit-ledger',
    label: 'Credit & Ledger',
    icon: '📒',
    items: [
      { path: '/dashboard/credit-ledger', label: 'Credit Ledger', icon: '📒' },
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

export const CASHIER_HIDDEN_DASHBOARD_PATHS = [
  '/dashboard/shop-users',
  '/dashboard/invitations',
  '/dashboard/join-requests',
];

export type DashboardNavRow = DashboardMenuItem & { groupLabel: string };

/** Sidebar groups for the signed-in user's role (cashier sees a subset). */
export function getDashboardMenuGroupsForRole(
  role: string | undefined
): DashboardMenuGroup[] {
  const isCashier = role === 'CASHIER';
  return DASHBOARD_MENU_GROUPS.map((group) => ({
    ...group,
    items: isCashier
      ? group.items.filter(
          (item) => !CASHIER_HIDDEN_DASHBOARD_PATHS.includes(item.path)
        )
      : group.items,
  })).filter((group) => group.items.length > 0);
}

/** Flattened nav for the signed-in user's role (cashier sees a subset). */
export function getDashboardNavRowsForRole(
  role: string | undefined
): DashboardNavRow[] {
  const isCashier = role === 'CASHIER';
  const rows: DashboardNavRow[] = [];
  for (const group of DASHBOARD_MENU_GROUPS) {
    const items = isCashier
      ? group.items.filter(
          (item) => !CASHIER_HIDDEN_DASHBOARD_PATHS.includes(item.path)
        )
      : group.items;
    for (const item of items) {
      rows.push({ ...item, groupLabel: group.label });
    }
  }
  return rows;
}
