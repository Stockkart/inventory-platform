import type { ShopAccess } from '@inventory-platform/access';
import type {
  DashboardMenuGroup,
  DashboardMenuItem,
} from '@inventory-platform/plugin-registry';

const ACCOUNTING_PREFIX = '/dashboard/accounting';

/** Paths gated by shop access — hidden until `/shops/me/access` has loaded. */
function isRbacGatedPath(path: string): boolean {
  if (path === '/dashboard/access-control') return true;
  if (path.startsWith(ACCOUNTING_PREFIX) || path === '/dashboard/accounting') {
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
  return false;
}

function isPathAllowed(path: string, access: ShopAccess): boolean {
  if (path === '/dashboard/access-control') {
    return access.canManageAccess;
  }
  if (path.startsWith(ACCOUNTING_PREFIX) || path === '/dashboard/accounting') {
    return access.modules.accounting;
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
  return true;
}

function filterGroupItems(
  items: DashboardMenuItem[],
  access: ShopAccess
): DashboardMenuItem[] {
  return items.filter((item) => isPathAllowed(item.path, access));
}

/** Filter sidebar groups using effective shop access from the API. */
export function filterDashboardMenuGroupsByAccess(
  groups: DashboardMenuGroup[],
  access: ShopAccess | null | undefined
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
      const hasAccessControl = items.some(
        (i) => i.path === '/dashboard/access-control'
      );
      if (!hasAccessControl) {
        items.push({
          path: '/dashboard/access-control',
          label: 'Access control',
          icon: '🔐',
        });
      }
    }
    return { ...group, items };
  });

  return withAccessControl.filter((group) => group.items.length > 0);
}

export function canAccessDashboardPath(
  path: string,
  access: ShopAccess | null | undefined
): boolean {
  if (!access) {
    return !isRbacGatedPath(path);
  }
  return isPathAllowed(path, access);
}
