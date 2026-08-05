import { route, type RouteConfigEntry } from '@react-router/dev/routes';
import {
  composeDashboardRouteEntries,
  type RoutePackageRegistration,
} from '@inventory-platform/routing';
import { accountingRoutes } from '@inventory-platform/accounting';
import { analyticsRoutes } from '@inventory-platform/analytics';
import { creditRoutes } from '@inventory-platform/credit';
import { misDashboardRoutes } from '@inventory-platform/mis';
import { planDashboardRoutes } from '@inventory-platform/plan';
import { pricingDashboardRoutes } from '@inventory-platform/pricing';
import { productDashboardRoutes } from '@inventory-platform/product';
import { remindersDashboardRoutes } from '@inventory-platform/reminders';
import { taxationRoutes } from '@inventory-platform/taxation';
import { userDashboardRoutes } from '@inventory-platform/user';
import { cafeRoutes } from '@inventory-platform/plugin-cafe/route-modules';
import { shellOverviewRoutes } from '@inventory-platform/shell';

const CORE = '../../../core';
const PLATFORM = '../../../platform';
const PLUGINS = '../../../plugins';

const DASHBOARD_ROUTE_REGISTRATIONS: RoutePackageRegistration[] = [
  { root: `${PLATFORM}/shell/src`, modules: shellOverviewRoutes },
  { root: `${CORE}/user/src`, modules: userDashboardRoutes },
  { root: `${CORE}/product/src`, modules: productDashboardRoutes },
  { root: `${CORE}/pricing/src`, modules: pricingDashboardRoutes },
  { root: `${PLUGINS}/cafe/src`, modules: cafeRoutes },
  { root: `${CORE}/plan/src`, modules: planDashboardRoutes },
  { root: `${CORE}/analytics/src`, modules: analyticsRoutes },
  { root: `${CORE}/reminders/src`, modules: remindersDashboardRoutes },
  { root: `${CORE}/accounting/src`, modules: accountingRoutes },
  { root: `${CORE}/mis/src`, modules: misDashboardRoutes },
  { root: `${CORE}/taxation/src`, modules: taxationRoutes },
  { root: `${CORE}/credit/src`, modules: creditRoutes },
];

const DASHBOARD_ROUTE_ENTRIES = composeDashboardRouteEntries(DASHBOARD_ROUTE_REGISTRATIONS);

/** Flattened dashboard child routes for the inventory app shell. */
export function composedDashboardRoutes(): RouteConfigEntry[] {
  return DASHBOARD_ROUTE_ENTRIES.map((entry) => route(entry.path, entry.file));
}

export { DASHBOARD_ROUTE_ENTRIES };
