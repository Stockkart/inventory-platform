import { isWorkerRole, type HrPermission, type ShopAccess } from '@inventory-platform/access';
import type { DashboardMenuGroup, DashboardMenuItem } from '@inventory-platform/routing';

const ACCOUNTING_PREFIX = '/dashboard/accounting';
const MIS_PREFIX = '/dashboard/mis';
const HR_PREFIX = '/dashboard/hr';

/**
 * The one dashboard page a WORKER login reaches (worker-app R2.1, R2.2). It is allowed even with
 * no linked employee: the shell renders the "not part of a shop yet" page there instead of My HR.
 */
export const WORKER_HOME_PATH = '/dashboard/hr/me';

/**
 * HR pages and the permission each needs (design "Frontend routes" table). Longer prefixes
 * first, so `/dashboard/hr/attendance/month` matches its own row before `/attendance`.
 * Unknown HR paths are denied.
 */
const HR_PATH_RULES: ReadonlyArray<{ prefix: string; allowed: (access: ShopAccess) => boolean }> = [
  { prefix: '/dashboard/hr/employees', allowed: (a) => hrCan(a, 'VIEW_EMPLOYEES') },
  { prefix: '/dashboard/hr/attendance', allowed: (a) => hrCan(a, 'VIEW_ATTENDANCE') },
  { prefix: '/dashboard/hr/leave', allowed: (a) => hrCan(a, 'VIEW_ATTENDANCE') },
  {
    prefix: '/dashboard/hr/payroll',
    allowed: (a) => hrCan(a, 'RUN_PAYROLL') || hrCan(a, 'RECORD_PAYMENTS'),
  },
  { prefix: '/dashboard/hr/advances', allowed: (a) => hrCan(a, 'MANAGE_ADVANCES') },
  // Self-service: only a linked employee, whatever their permissions or HR switch.
  { prefix: '/dashboard/hr/me', allowed: (a) => Boolean(a.hr?.employeeId) },
  // Settings: any HR staff permission (self check-in alone opens no staff screen, as on the
  // server); the section itself is read-only without MANAGE_SETTINGS.
  {
    prefix: '/dashboard/hr/settings',
    allowed: (a) => (a.hr?.permissions ?? []).some((p) => p !== 'SELF_CHECK_IN'),
  },
  // The Attendance app privacy note (HR-module R9.14) carries no shop data: anyone with HR
  // access, staff or a linked employee, may read it.
  {
    prefix: '/dashboard/hr/attendance-app-privacy',
    allowed: (a) => (a.hr?.permissions ?? []).length > 0 || Boolean(a.hr?.employeeId),
  },
];

function hrCan(access: ShopAccess, permission: HrPermission): boolean {
  // `hr` may be missing on an older backend; treat that as no HR access.
  return access.hr?.permissions?.includes(permission) ?? false;
}

function isHrPath(path: string): boolean {
  return path === HR_PREFIX || path.startsWith(`${HR_PREFIX}/`);
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isHrPathAllowed(path: string, access: ShopAccess): boolean {
  const rule = HR_PATH_RULES.find((r) => matchesPrefix(path, r.prefix));
  return rule ? rule.allowed(access) : false;
}

/** Paths gated by shop access — hidden until `/shops/me/access` has loaded. */
function isRbacGatedPath(path: string): boolean {
  if (path === '/dashboard/access-control') return true;
  if (path.startsWith(ACCOUNTING_PREFIX) || path === '/dashboard/accounting') {
    return true;
  }
  if (path.startsWith(MIS_PREFIX) || path === '/dashboard/mis') {
    return true;
  }
  if (path === '/dashboard/analytics') return true;
  if (path === '/dashboard/taxes') return true;
  if (path === '/dashboard/whatsapp-marketing') return true;
  if (path === '/dashboard/plan-payment' || path === '/dashboard/plan-status') {
    return true;
  }
  if (path === '/dashboard/invitations') return true;
  if (path === '/dashboard/join-requests') return true;
  if (path === '/dashboard/shop-users') return true;
  if (isHrPath(path)) return true;
  return false;
}

function isPathAllowed(path: string, access: ShopAccess): boolean {
  // A WORKER membership grants nothing on the staff side (worker-app R2.1): My HR only, every
  // other route, menu item and module is denied whatever the shop's modules or HR grid say.
  if (isWorkerRole(access.role)) {
    return matchesPrefix(path, WORKER_HOME_PATH);
  }
  if (path === '/dashboard/access-control') {
    return access.canManageAccess;
  }
  if (path.startsWith(ACCOUNTING_PREFIX) || path === '/dashboard/accounting') {
    return access.modules.accounting;
  }
  if (path.startsWith(MIS_PREFIX) || path === '/dashboard/mis') {
    return Boolean(access.modules.mis);
  }
  if (path === '/dashboard/analytics') {
    return access.modules.analytics;
  }
  if (path === '/dashboard/taxes') {
    return access.modules.taxes;
  }
  if (path === '/dashboard/whatsapp-marketing') {
    return access.modules.marketing;
  }
  if (path === '/dashboard/plan-payment' || path === '/dashboard/plan-status') {
    return access.modules.paymentPlan;
  }
  if (path === '/dashboard/invitations') {
    return access.team.manageInvitations;
  }
  if (path === '/dashboard/join-requests') {
    return access.team.manageJoinRequests;
  }
  if (path === '/dashboard/shop-users') {
    return access.team.manageShopUsers;
  }
  if (path === '/dashboard/my-invitations') {
    return access.team.viewMyInvitations;
  }
  if (isHrPath(path)) {
    return isHrPathAllowed(path, access);
  }
  return true;
}

function filterGroupItems(items: DashboardMenuItem[], access: ShopAccess): DashboardMenuItem[] {
  return items.filter((item) => isPathAllowed(item.path, access));
}

/** The menu a WORKER login sees: My HR and nothing else (worker-app R2.1). */
function workerMenuGroups(groups: DashboardMenuGroup[]): DashboardMenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesPrefix(item.path, WORKER_HOME_PATH)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Filter sidebar groups using effective shop access from the API. `role` is the signed-in login's
 * role from the session: a WORKER sees My HR only, even before `/shops/me/access` has loaded, so
 * the shop modules never flash in the sidebar.
 */
export function filterDashboardMenuGroupsByAccess(
  groups: DashboardMenuGroup[],
  access: ShopAccess | null | undefined,
  role?: string | null,
): DashboardMenuGroup[] {
  if (isWorkerRole(role) || (access && isWorkerRole(access.role))) {
    return workerMenuGroups(groups);
  }
  if (!access) {
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !isRbacGatedPath(item.path)),
      }))
      .filter((group) => group.items.length > 0);
  }
  const withAccessControl: DashboardMenuGroup[] = groups.map((group) => {
    if (group.id !== 'team') {
      return {
        ...group,
        items: filterGroupItems(group.items, access),
      };
    }
    const items = filterGroupItems(group.items, access);
    if (access.canManageAccess && !isWorkerRole(access.role)) {
      const hasAccessControl = items.some((i) => i.path === '/dashboard/access-control');
      if (!hasAccessControl) {
        items.push({
          path: '/dashboard/access-control',
          label: 'Access control',
          icon: 'lock',
        });
      }
    }
    return { ...group, items };
  });

  return withAccessControl.filter((group) => group.items.length > 0);
}

/**
 * Whether the signed-in login may open `path`. `role` is the session role: a WORKER may open My HR
 * only, whether or not `/shops/me/access` has answered (worker-app R2.1, R2.2).
 */
export function canAccessDashboardPath(
  path: string,
  access: ShopAccess | null | undefined,
  role?: string | null,
): boolean {
  if (isWorkerRole(role)) {
    return matchesPrefix(path, WORKER_HOME_PATH);
  }
  if (!access) {
    return !isRbacGatedPath(path);
  }
  return isPathAllowed(path, access);
}
