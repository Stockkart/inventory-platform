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
    // Kitchen tickets are issued from this screen: Print KOT sits with the order it punches
    // (`ui/CafeKotBar.tsx`, mounted through `VerticalPlugin.sellActions`). There is no
    // separate KOT screen, and so no nav entry for one.
    { path: '/dashboard/menu-sell', label: 'Sell', icon: 'shopping-cart' },
  ],
};
