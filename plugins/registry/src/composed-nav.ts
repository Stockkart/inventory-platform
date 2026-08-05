import type { NavContribution } from '@inventory-platform/routing';
import {
  mergeNavContributions,
  getDashboardNavRows,
  type DashboardMenuGroup,
  type DashboardMenuItem,
  type DashboardNavRow,
} from '@inventory-platform/routing';
import { accountingNav } from '@inventory-platform/accounting/nav';
import { analyticsNav } from '@inventory-platform/analytics/nav';
import { creditNav } from '@inventory-platform/credit/nav';
import { misNav } from '@inventory-platform/mis/nav';
import { planNav } from '@inventory-platform/plan/nav';
import { pricingNav } from '@inventory-platform/pricing/nav';
import { productHistoryNav, productNav, productReturnsNav } from '@inventory-platform/product/nav';
import { remindersNav } from '@inventory-platform/reminders/nav';
import { taxationNav } from '@inventory-platform/taxation/nav';
import {
  userContactNav,
  userMarketingNav,
  userOverviewNav,
  userTeamNav,
} from '@inventory-platform/user/nav';

export type { DashboardMenuGroup, DashboardMenuItem, DashboardNavRow };

const NAV_GROUP_ORDER: string[] = [
  'overview',
  'products',
  'cafe',
  'contact',
  'credit',
  'accounting',
  'mis',
  'returns',
  'analytics-history',
  'taxation',
  'reminders-alerts',
  'marketing',
  'team',
  'plan-billing',
];

/** Shell-owned home link; merged into overview with user nav contributions. */
export const shellOverviewNav: NavContribution = {
  groupId: 'overview',
  label: 'Overview',
  icon: 'layout-dashboard',
  items: [{ path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' }],
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
  misNav,
  productReturnsNav,
  analyticsNav,
  productHistoryNav,
  taxationNav,
  remindersNav,
  userMarketingNav,
  userTeamNav,
  planNav,
];

export { mergeNavContributions };

export const COMPOSED_DASHBOARD_MENU_GROUPS = mergeNavContributions(
  CORE_NAV_CONTRIBUTIONS,
  NAV_GROUP_ORDER,
);

/** @deprecated Use {@link COMPOSED_DASHBOARD_MENU_GROUPS}. */
export const DASHBOARD_MENU_GROUPS = COMPOSED_DASHBOARD_MENU_GROUPS;

/** Sidebar groups — RBAC filtering happens in shell {@link filterDashboardMenuGroupsByAccess}. */
export function getDashboardMenuGroupsForRole(_role: string | undefined): DashboardMenuGroup[] {
  return COMPOSED_DASHBOARD_MENU_GROUPS;
}

export function getDashboardNavRowsForRole(_role: string | undefined): DashboardNavRow[] {
  return getDashboardNavRows(COMPOSED_DASHBOARD_MENU_GROUPS);
}
