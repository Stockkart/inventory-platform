import type { NavContribution } from '@inventory-platform/routing';

export const cafeNav: NavContribution = {
  groupId: 'cafe',
  label: 'Cafe',
  icon: 'coffee',
  items: [
    {
      path: '/dashboard/product-registration',
      label: 'Ingredient Registration',
      icon: 'package',
    },
    {
      path: '/dashboard/manual-stock',
      label: 'Ingredient Search',
      icon: 'search',
    },
    { path: '/dashboard/menu', label: 'Menu', icon: 'clipboard-list' },
    { path: '/dashboard/menu-sell', label: 'Sell', icon: 'shopping-cart' },
  ],
};
