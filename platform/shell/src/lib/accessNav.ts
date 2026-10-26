import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import type { DashboardMenuGroup, DashboardMenuItem } from '@inventory-platform/routing';

const ACCOUNTING_PREFIX = '/dashboard/accounting';
const MIS_PREFIX = '/dashboard/mis';
const HR_PREFIX = '/dashboard/hr';

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

/** Filter sidebar groups using effective shop access from the API. */
export function filterDashboardMenuGroupsByAccess(
  groups: DashboardMenuGroup[],
  access: ShopAccess | null | undefined,
): DashboardMenuGroup[] {
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
    if (access.canManageAccess) {
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

export function canAccessDashboardPath(
  path: string,
  access: ShopAccess | null | undefined,
): boolean {
  if (!access) {
    return !isRbacGatedPath(path);
  }
  return isPathAllowed(path, access);
}
