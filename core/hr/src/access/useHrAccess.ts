import { useCallback, useMemo } from 'react';
import type { HrPermission } from '@inventory-platform/access';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';

export interface HrAccessView {
  /** True when the signed-in user holds `permission` in the active shop. */
  can: (permission: HrPermission) => boolean;
  /** Linked employee record of the signed-in user, or `null` (no "My HR" area). */
  employeeId: string | null;
  isOwner: boolean;
  /** `/shops/me/access` has loaded for the active shop. */
  accessLoaded: boolean;
  /** HR block present, i.e. the member's HR switch is on (self-service works either way). */
  hrEnabled: boolean;
}

const NO_PERMISSIONS: readonly HrPermission[] = [];

/**
 * HR permissions of the signed-in user for the active shop, for showing or hiding buttons.
 * The backend already resolves owner → module switch → role grid (owner gets every permission),
 * so `can` only reads the resolved list. The server re-checks every request; this is UI only.
 */
export function useHrAccess(): HrAccessView {
  const { user } = useAuthStore();
  const access = useShopAccessStore((s) => (user?.shopId ? s.byShopId[user.shopId] : undefined));
  // `hr` may be missing on responses from a backend without the HR module; treat as "no access".
  const hr = access?.hr ?? null;
  const permissions = hr?.permissions ?? NO_PERMISSIONS;
  const employeeId = hr?.employeeId ?? null;
  const isOwner = access?.owner === true;

  const can = useCallback(
    (permission: HrPermission) => permissions.includes(permission),
    [permissions],
  );

  const accessLoaded = access != null;
  const hrEnabled = hr != null;

  return useMemo(
    () => ({ can, employeeId, isOwner, accessLoaded, hrEnabled }),
    [can, employeeId, isOwner, accessLoaded, hrEnabled],
  );
}
