import type { NavContribution } from '@inventory-platform/routing';

export const planNav: NavContribution = {
  groupId: 'plan-billing',
  label: 'Plan & Billing',
  icon: '💳',
  items: [
    { path: '/dashboard/plan-payment', label: 'Payment', icon: '💳' },
    { path: '/dashboard/plan-status', label: 'My Plan', icon: '📋' },
    { path: '/dashboard/payment-billing', label: 'Payment & Billing', icon: '🧾' },
  ],
};
