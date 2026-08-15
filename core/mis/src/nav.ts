import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the MIS domain. */
export const misNav: NavContribution = {
  groupId: 'mis',
  label: 'MIS',
  icon: 'clipboard-list',
  requiredCapability: 'mis',
  items: [
    { path: '/dashboard/mis/vendor-money', label: 'Vendor Money', icon: 'circle-dollar-sign' },
    { path: '/dashboard/mis/customer-money', label: 'Customer MIS', icon: 'users' },
    { path: '/dashboard/mis/stock', label: 'Stock', icon: 'package' },
  ],
};
