import type { NavContribution } from '@inventory-platform/routing';

export const planNav: NavContribution = {
  groupId: 'plan-billing',
  label: 'Plan & Billing',
  icon: 'credit-card',
  items: [
    { path: '/dashboard/plan-payment', label: 'Payment', icon: 'credit-card' },
    { path: '/dashboard/plan-status', label: 'My Plan', icon: 'clipboard-list' },
    { path: '/dashboard/payment-billing', label: 'Payment & Billing', icon: 'receipt' },
  ],
};
