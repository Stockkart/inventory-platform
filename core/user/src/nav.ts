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

export const userOverviewNav: NavContribution = {
  groupId: 'overview',
  label: 'Overview',
  icon: '📊',
  items: [
    { path: '/dashboard/shops', label: 'Shops', icon: '🏪' },
    { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
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
    { path: '/dashboard/join-requests', label: 'Join Requests', icon: '🤝' },
    { path: '/dashboard/shop-users', label: 'Shop Users', icon: '👥' },
  ],
};

export const userMarketingNav: NavContribution = {
  groupId: 'marketing',
  label: 'Marketing',
  icon: '📣',
  items: [
    {
      path: '/dashboard/whatsapp-marketing',
      label: 'WhatsApp Marketing',
      icon: '💬',
    },
  ],
};
