import type { NavContribution } from '@inventory-platform/routing';

export const planNav: NavContribution = {
  groupId: 'plan-billing',
  label: 'Plan & Billing',
  icon: 'credit-card',
  items: [
    { path: '/dashboard/plan-payment', label: 'Payment', icon: 'credit-card' },
    { path: '/dashboard/plan-status', label: 'My Plan', icon: 'clipboard-list' },
    { path: '/dashboard/referrals', label: 'Referrals & Wallet', icon: 'handshake' },
  ],
};

/** Shown only to platform admins; see the shell's platform admin filter. */
export const platformAdminNav: NavContribution = {
  groupId: 'platform-admin',
  label: 'Platform admin',
  icon: 'lock',
  items: [
    { path: '/dashboard/platform-admin/mis', label: 'Revenue MIS', icon: 'trending-up' },
    {
      path: '/dashboard/platform-admin/referrals',
      label: 'Referral operations',
      icon: 'handshake',
    },
    { path: '/dashboard/platform-admin/vouchers', label: 'Vouchers', icon: 'receipt' },
  ],
};
