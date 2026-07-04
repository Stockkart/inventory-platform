import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the analytics domain. */
export const analyticsNav: NavContribution = {
  groupId: 'analytics-history',
  label: 'Analytics',
  icon: '📈',
  requiredCapability: 'analytics',
  items: [{ path: '/dashboard/analytics', label: 'Analytics', icon: '📈' }],
};
