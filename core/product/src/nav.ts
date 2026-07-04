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
