import { route, type RouteConfigEntry } from '@react-router/dev/routes';
import {
  composeDashboardRouteEntries,
  type RoutePackageRegistration,
} from '@inventory-platform/routing';
import { accountingRoutes } from '../../../core/accounting/src/routes';
import { analyticsRoutes } from '../../../core/analytics/src/routes';
import { creditRoutes } from '../../../core/credit/src/routes';
import { planDashboardRoutes } from '../../../core/plan/src/routes';
import { pricingDashboardRoutes } from '../../../core/pricing/src/routes';
import { productDashboardRoutes } from '../../../core/product/src/routes';
import { remindersDashboardRoutes } from '../../../core/reminders/src/routes';
import { taxationRoutes } from '../../../core/taxation/src/routes';
import { userDashboardRoutes } from '../../../core/user/src/routes';
import { cafeRoutes } from '../../cafe/src/routes';
import { shellOverviewRoutes } from '../../../platform/shell/src/routes';

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
  { root: `${CORE}/taxation/src`, modules: taxationRoutes },
  { root: `${CORE}/credit/src`, modules: creditRoutes },
];

const DASHBOARD_ROUTE_ENTRIES = composeDashboardRouteEntries(
  DASHBOARD_ROUTE_REGISTRATIONS
);

/** Flattened dashboard child routes for the inventory app shell. */
export function composedDashboardRoutes(): RouteConfigEntry[] {
  return DASHBOARD_ROUTE_ENTRIES.map((entry) => route(entry.path, entry.file));
}

export { DASHBOARD_ROUTE_ENTRIES };
