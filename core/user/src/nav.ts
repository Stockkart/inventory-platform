import type { NavContribution } from '@inventory-platform/routing';

export const userContactNav: NavContribution = {
  groupId: 'contact',
  label: 'Contact',
  icon: '📇',
  items: [
    { path: '/dashboard/customers', label: 'Customer', icon: '👥' },
    { path: '/dashboard/vendors', label: 'Vendor', icon: '🚚' },
  ],
};

export const userTeamNav: NavContribution = {
  groupId: 'team',
  label: 'Team & Collaboration',
  icon: '👥',
  items: [
    { path: '/dashboard/invitations', label: 'Invitations', icon: '✉️' },
    {
      path: '/dashboard/my-invitations',
      label: 'My Invitations',
      icon: '📬',
    },
    { path: '/dashboard/shop-users', label: 'Shop Users', icon: '👥' },
  ],
};
