import type { NavContribution } from '@inventory-platform/routing';

export const cafeNav: NavContribution = {
  groupId: 'cafe',
  label: 'Cafe',
  icon: 'coffee',
  items: [
    {
      path: '/dashboard/product-entry',
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
    // The backend gates this path (CafeUiContributor) but cannot supply the item:
    // capabilityNav keeps only the contributions listed here whose path the API enabled.
    // Present in one layer and absent in the other means the screen is simply unreachable.
    { path: '/dashboard/cafe-kot', label: 'KOT', icon: 'clipboard-list' },
  ],
};
