import type { HrPermission } from '@inventory-platform/access';

/** Backend `requires` map: permission → the permissions it cannot work without. */
export type HrRequiresMap = Partial<Record<HrPermission, readonly HrPermission[]>>;

/**
 * Next row after ticking or unticking `permission`, keeping the order of `allPermissions`.
 * Ticking also ticks everything it requires (the backend applies the same closure on save, so the
 * grid shows what will be stored). Unticking removes only that permission; the ones it needed stay
 * ticked but are no longer locked.
 */
export function togglePermission(
  row: readonly HrPermission[],
  permission: HrPermission,
  checked: boolean,
  requires: HrRequiresMap,
  allPermissions: readonly HrPermission[],
): HrPermission[] {
  const next = new Set(row);
  if (checked) {
    next.add(permission);
    for (const needed of requires[permission] ?? []) next.add(needed);
  } else {
    next.delete(permission);
  }
  return allPermissions.filter((p) => next.has(p));
}

/** Permissions that another ticked permission in `row` needs; they cannot be unticked. */
export function lockedPermissions(
  row: readonly HrPermission[],
  requires: HrRequiresMap,
): Set<HrPermission> {
  const locked = new Set<HrPermission>();
  for (const p of row) {
    for (const needed of requires[p] ?? []) locked.add(needed);
  }
  return locked;
}

/**
 * Copy of backend `HrPermission.requires()` (wt-hr-api `domain/model/enums/HrPermission.java`).
 * The grid uses the `requires` map the server sends; this table pins the same rules for the
 * parity property test (task 22.2) and as a fallback while the map has not loaded.
 */
export const HR_PERMISSION_REQUIRES: HrRequiresMap = {
  MARK_ATTENDANCE: ['VIEW_ATTENDANCE'],
  APPROVE_LEAVE: ['VIEW_ATTENDANCE'],
  ADD_EDIT_EMPLOYEES: ['VIEW_EMPLOYEES'],
  RUN_PAYROLL: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  RECORD_PAYMENTS: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  MANAGE_ADVANCES: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
};

/**
 * Backend `HrPermission.closure`: the set plus everything it requires, in `allPermissions` order.
 * One pass is enough because no required permission requires anything itself.
 */
export function closePermissions(
  row: readonly HrPermission[],
  requires: HrRequiresMap,
  allPermissions: readonly HrPermission[],
): HrPermission[] {
  const closed = new Set<HrPermission>();
  for (const p of row) {
    closed.add(p);
    for (const needed of requires[p] ?? []) closed.add(needed);
  }
  return allPermissions.filter((p) => closed.has(p));
}
