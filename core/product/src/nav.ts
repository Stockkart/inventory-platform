import type { NavContribution } from '@inventory-platform/routing';

export const productNav: NavContribution = {
  groupId: 'products',
  label: 'Products & Sales',
  icon: 'package',
  items: [
    {
      path: '/dashboard/product-registration',
      label: 'Product Registration',
      icon: 'package',
    },
    {
      path: '/dashboard/product-search',
      label: 'Product Search',
      icon: 'search',
    },
    {
      path: '/dashboard/stock-corrections',
      label: 'Stock corrections',
      icon: 'wrench',
    },
    { path: '/dashboard/scan-sell', label: 'Scan and Sell', icon: 'smartphone' },
  ],
};

export const productReturnsNav: NavContribution = {
  groupId: 'returns',
  label: 'Returns',
  icon: 'undo-2',
  items: [
    {
      path: '/dashboard/refund',
      label: 'Return to customer',
      icon: 'undo-2',
    },
    {
      path: '/dashboard/vendor-return',
      label: 'Return to vendor',
      icon: 'upload',
    },
  ],
};

export const productHistoryNav: NavContribution = {
  groupId: 'analytics-history',
  label: 'Reports & Analytics',
  icon: 'trending-up',
  items: [{ path: '/dashboard/history', label: 'History', icon: 'scroll-text' }],
};
