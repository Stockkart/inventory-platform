import type { NavContribution } from '@inventory-platform/routing';

export const cafeNav: NavContribution = {
  groupId: 'cafe',
  label: 'Cafe',
  icon: 'coffee',
  items: [
    { path: '/dashboard/menu-sell', label: 'Sell', icon: 'shopping-cart' },
    { path: '/dashboard/menu', label: 'Menu Admin', icon: 'clipboard-list' },
    { path: '/dashboard/manual-stock', label: 'Ingredient Search', icon: 'search' },
    {
      path: '/dashboard/product-registration',
      label: 'Product Registration',
      icon: 'package',
    },
  ],
};
