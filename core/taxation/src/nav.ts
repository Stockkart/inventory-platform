import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the taxation domain. */
export const taxationNav: NavContribution = {
  groupId: 'taxation',
  label: 'Taxes',
  icon: 'clipboard-list',
  requiredCapability: 'taxes',
  items: [{ path: '/dashboard/taxes', label: 'Taxes', icon: 'clipboard-list' }],
};
