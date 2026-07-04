import type { NavContribution } from '@inventory-platform/routing';

export const cafeNav: NavContribution = {
  groupId: 'cafe',
  label: 'Cafe',
  icon: '☕',
  items: [
    { path: '/dashboard/menu-sell', label: 'Sell', icon: '🛒' },
    { path: '/dashboard/menu', label: 'Menu Admin', icon: '📋' },
    { path: '/dashboard/manual-stock', label: 'Ingredient Search', icon: '🔍' },
    {
      path: '/dashboard/product-registration',
      label: 'Product Registration',
      icon: '📦',
    },
  ],
};
