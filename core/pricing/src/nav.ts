import type { NavContribution } from '@inventory-platform/routing';

export const pricingNav: NavContribution = {
  groupId: 'products',
  label: 'Products & Sales',
  icon: 'package',
  items: [{ path: '/dashboard/pricing', label: 'Pricing', icon: 'circle-dollar-sign' }],
};
