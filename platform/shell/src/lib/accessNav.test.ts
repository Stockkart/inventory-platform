import { describe, expect, it } from 'vitest';
import type { DashboardMenuGroup } from '@inventory-platform/routing';
import { filterPlatformAdminGroups, isPlatformAdminPath } from './accessNav';

const groups: DashboardMenuGroup[] = [
  {
    id: 'plan-billing',
    label: 'Plan & Billing',
    icon: 'credit-card',
    items: [{ path: '/dashboard/plan-status', label: 'My Plan', icon: 'clipboard-list' }],
  },
  {
    id: 'platform-admin',
    label: 'Platform admin',
    icon: 'lock',
    items: [{ path: '/dashboard/platform-admin/mis', label: 'Revenue MIS', icon: 'trending-up' }],
  },
];

describe('platform admin nav', () => {
  it('matches only the platform admin section', () => {
    expect(isPlatformAdminPath('/dashboard/platform-admin/mis')).toBe(true);
    expect(isPlatformAdminPath('/dashboard/platform-admin')).toBe(true);
    expect(isPlatformAdminPath('/dashboard/platform-administrator')).toBe(false);
    expect(isPlatformAdminPath('/dashboard/mis/sales')).toBe(false);
  });

  it('drops the admin group for everyone else', () => {
    expect(filterPlatformAdminGroups(groups, false).map((g) => g.id)).toEqual(['plan-billing']);
    expect(filterPlatformAdminGroups(groups, true)).toBe(groups);
  });
});
