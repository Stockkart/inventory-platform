import type { NavContribution, NavContributionItem } from '@inventory-platform/routing';
import { accountingNav } from '@inventory-platform/accounting/nav';
import { analyticsNav } from '@inventory-platform/analytics/nav';
import { creditNav } from '@inventory-platform/credit/nav';
import { planNav } from '@inventory-platform/plan/nav';
import { pricingNav } from '@inventory-platform/pricing/nav';
import {
  productHistoryNav,
  productNav,
  productReturnsNav,
} from '@inventory-platform/product/nav';
import { remindersNav } from '@inventory-platform/reminders/nav';
import { taxationNav } from '@inventory-platform/taxation/nav';
import {
  userContactNav,
  userMarketingNav,
  userOverviewNav,
  userTeamNav,
} from '@inventory-platform/user/nav';

export type DashboardMenuItem = NavContributionItem;

export type DashboardMenuGroup = {
  id: string;
  label: string;
  icon: string;
  items: DashboardMenuItem[];
};

export type DashboardNavRow = DashboardMenuItem & { groupLabel: string };

/** Shell-owned home link; merged into overview with user nav contributions. */
export const shellOverviewNav: NavContribution = {
  groupId: 'overview',
  label: 'Overview',
  icon: '📊',
  items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }],
};

/** Core domain nav contributions (vertical plugin nav is merged separately). */
export const CORE_NAV_CONTRIBUTIONS: NavContribution[] = [
  shellOverviewNav,
  userOverviewNav,
  productNav,
  pricingNav,
  userContactNav,
  creditNav,
  accountingNav,
  productReturnsNav,
  analyticsNav,
  productHistoryNav,
  taxationNav,
  remindersNav,
  userMarketingNav,
  userTeamNav,
  planNav,
];

const NAV_GROUP_ORDER: string[] = [
  'overview',
  'products',
  'cafe',
  'contact',
  'credit',
  'accounting',
  'returns',
  'analytics-history',
  'taxation',
  'reminders-alerts',
  'marketing',
  'team',
  'plan-billing',
];

export function mergeNavContributions(
  contributions: NavContribution[]
): DashboardMenuGroup[] {
  const byId = new Map<string, DashboardMenuGroup>();

  for (const contribution of contributions) {
    const existing = byId.get(contribution.groupId);
    if (!existing) {
      byId.set(contribution.groupId, {
        id: contribution.groupId,
        label: contribution.label,
        icon: contribution.icon,
        items: [...contribution.items],
      });
      continue;
    }

    const paths = new Set(existing.items.map((item) => item.path));
    for (const item of contribution.items) {
      if (!paths.has(item.path)) {
        existing.items.push(item);
        paths.add(item.path);
      }
    }
  }

  const ordered: DashboardMenuGroup[] = [];
  for (const id of NAV_GROUP_ORDER) {
    const group = byId.get(id);
    if (group && group.items.length > 0) {
      ordered.push(group);
      byId.delete(id);
    }
  }
  for (const group of byId.values()) {
    if (group.items.length > 0) {
      ordered.push(group);
    }
  }
  return ordered;
}

export const COMPOSED_DASHBOARD_MENU_GROUPS =
  mergeNavContributions(CORE_NAV_CONTRIBUTIONS);

/** @deprecated Use {@link COMPOSED_DASHBOARD_MENU_GROUPS}. */
export const DASHBOARD_MENU_GROUPS = COMPOSED_DASHBOARD_MENU_GROUPS;

/** Sidebar groups — RBAC filtering happens in shell {@link filterDashboardMenuGroupsByAccess}. */
export function getDashboardMenuGroupsForRole(
  _role: string | undefined
): DashboardMenuGroup[] {
  return COMPOSED_DASHBOARD_MENU_GROUPS;
}

export function getDashboardNavRowsForRole(
  _role: string | undefined
): DashboardNavRow[] {
  const rows: DashboardNavRow[] = [];
  for (const group of COMPOSED_DASHBOARD_MENU_GROUPS) {
    for (const item of group.items) {
      rows.push({ ...item, groupLabel: group.label });
    }
  }
  return rows;
}
