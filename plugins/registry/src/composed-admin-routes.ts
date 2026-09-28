import { index, layout, route, type RouteConfigEntry } from '@react-router/dev/routes';
import { flattenRouteModules } from '@inventory-platform/routing';
import { ADMIN_ROUTE_FILES } from '@inventory-platform/admin';
import { planAdminToolRoutes } from '@inventory-platform/plan';

/** Paths from `apps/admin/app` to the package `src/` directories. */
const ADMIN = '../../../core/admin/src';
const PLAN = '../../../core/plan/src';

const PLAN_TOOL_ENTRIES = flattenRouteModules({ root: PLAN, modules: planAdminToolRoutes });

/** Route tree for the admin app: sign-in pages outside the admin layout, tools inside it. */
export function composedAdminRoutes(): RouteConfigEntry[] {
  return [
    route('login', `${ADMIN}/${ADMIN_ROUTE_FILES.login}`),
    route('change-password', `${ADMIN}/${ADMIN_ROUTE_FILES.changePassword}`),
    layout(`${ADMIN}/${ADMIN_ROUTE_FILES.layout}`, [
      index(`${ADMIN}/${ADMIN_ROUTE_FILES.home}`),
      route('admins', `${ADMIN}/${ADMIN_ROUTE_FILES.admins}`),
      ...PLAN_TOOL_ENTRIES.map((entry) => route(entry.path, entry.file)),
    ]),
  ];
}

export { PLAN_TOOL_ENTRIES };
