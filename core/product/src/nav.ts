import type { NavContribution } from '@inventory-platform/routing';

export const productNav: NavContribution = {
  groupId: 'products',
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
    {
      path: '/dashboard/stock-corrections',
      label: 'Stock corrections',
      icon: '🛠️',
    },
    { path: '/dashboard/scan-sell', label: 'Scan and Sell', icon: '📱' },
  ],
};

export const productReturnsNav: NavContribution = {
  groupId: 'returns',
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
};

export const productHistoryNav: NavContribution = {
  groupId: 'analytics-history',
  label: 'Reports & Analytics',
  icon: '📈',
  items: [{ path: '/dashboard/history', label: 'History', icon: '📜' }],
};
