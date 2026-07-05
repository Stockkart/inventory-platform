import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the credit domain. */
export const creditNav: NavContribution = {
  groupId: 'credit',
  label: 'Credit',
  icon: 'handshake',
  requiredCapability: 'credit',
  items: [{ path: '/dashboard/credit', label: 'Credit balances', icon: 'handshake' }],
};
