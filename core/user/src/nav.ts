import type { NavContribution } from '@inventory-platform/routing';

export const userContactNav: NavContribution = {
  groupId: 'contact',
  label: 'Contact',
  icon: 'contact',
  items: [
    { path: '/dashboard/customers', label: 'Customer', icon: 'users' },
    { path: '/dashboard/vendors', label: 'Vendor', icon: 'truck' },
  ],
};

export const userOverviewNav: NavContribution = {
  groupId: 'overview',
  label: 'Overview',
  icon: 'layout-dashboard',
  items: [
    { path: '/dashboard/shops', label: 'Shops', icon: 'store' },
    { path: '/dashboard/profile', label: 'Profile', icon: 'user' },
  ],
};

export const userTeamNav: NavContribution = {
  groupId: 'team',
  label: 'Team & Collaboration',
  icon: 'users',
  items: [
    { path: '/dashboard/invitations', label: 'Invitations', icon: 'mail' },
    {
      path: '/dashboard/my-invitations',
      label: 'My Invitations',
      icon: 'inbox',
    },
    { path: '/dashboard/join-requests', label: 'Join Requests', icon: 'handshake' },
    { path: '/dashboard/shop-users', label: 'Shop Users', icon: 'users' },
  ],
};

export const userMarketingNav: NavContribution = {
  groupId: 'marketing',
  label: 'Marketing',
  icon: 'megaphone',
  items: [
    {
      path: '/dashboard/whatsapp-marketing',
      label: 'WhatsApp Marketing',
      icon: 'message-circle',
    },
  ],
};
