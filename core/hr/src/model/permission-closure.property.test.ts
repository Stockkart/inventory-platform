// Task 22.2 — Property 1 (frontend): PermissionGrid auto-ticks match the backend closure rules
// (R1.3). The table below is written out from wt-hr-api `HrPermission.requires()`; the property
// checks that the grid's toggle logic (`togglePermission` / `lockedPermissions`) never shows a
// row the server would store differently.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HR_PERMISSIONS, type HrPermission } from '@inventory-platform/access';
import {
  HR_PERMISSION_REQUIRES,
  closePermissions,
  lockedPermissions,
  togglePermission,
} from './permission-closure';

/** Backend `HrPermission.requires()`, one line per rule (Java switch in `HrPermission.java`). */
const BACKEND_REQUIRES: Record<HrPermission, HrPermission[]> = {
  VIEW_ATTENDANCE: [],
  MARK_ATTENDANCE: ['VIEW_ATTENDANCE'],
  APPROVE_LEAVE: ['VIEW_ATTENDANCE'],
  VIEW_EMPLOYEES: [],
  ADD_EDIT_EMPLOYEES: ['VIEW_EMPLOYEES'],
  VIEW_SALARIES: [],
  RUN_PAYROLL: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  RECORD_PAYMENTS: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  MANAGE_ADVANCES: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
  MANAGE_SETTINGS: [],
};

/** Backend `HrPermission.closure`: the set plus everything each member requires. */
function backendClosure(row: readonly HrPermission[]): Set<HrPermission> {
  const closed = new Set<HrPermission>();
  for (const p of row) {
    closed.add(p);
    for (const r of BACKEND_REQUIRES[p]) closed.add(r);
  }
  return closed;
}

const permission = fc.constantFrom(...HR_PERMISSIONS);
const row = fc.uniqueArray(permission, { maxLength: HR_PERMISSIONS.length });
/** A click on the grid: tick or untick one box. */
const click = fc.record({ permission, checked: fc.boolean() });

const sorted = (ps: Iterable<HrPermission>) => [...ps].sort();

describe('permission closure parity (task 22.2)', () => {
  it('pins the same requirement table as the backend', () => {
    for (const p of HR_PERMISSIONS) {
      expect(sorted(HR_PERMISSION_REQUIRES[p] ?? [])).toEqual(sorted(BACKEND_REQUIRES[p]));
    }
  });

  it('closes like the backend and is idempotent', () => {
    fc.assert(
      fc.property(row, (r) => {
        const once = closePermissions(r, HR_PERMISSION_REQUIRES, HR_PERMISSIONS);
        expect(sorted(once)).toEqual(sorted(backendClosure(r)));
        expect(closePermissions(once, HR_PERMISSION_REQUIRES, HR_PERMISSIONS)).toEqual(once);
      }),
    );
  });

  it('keeps every ticked permission’s requirements ticked through any clicks', () => {
    fc.assert(
      fc.property(row, fc.array(click, { maxLength: 30 }), (start, clicks) => {
        // The grid starts from what the server stored, which is always closed.
        let current = closePermissions(start, HR_PERMISSION_REQUIRES, HR_PERMISSIONS);
        for (const { permission: p, checked } of clicks) {
          // Locked boxes are disabled in the grid, so such a click never reaches the toggle.
          if (!checked && lockedPermissions(current, HR_PERMISSION_REQUIRES).has(p)) continue;
          current = togglePermission(current, p, checked, HR_PERMISSION_REQUIRES, HR_PERMISSIONS);
          for (const ticked of current) {
            for (const needed of BACKEND_REQUIRES[ticked]) expect(current).toContain(needed);
          }
          // What the grid shows is exactly what the server would store on save.
          expect(sorted(current)).toEqual(sorted(backendClosure(current)));
        }
      }),
    );
  });

  it('ticking a box gives the same row as the backend closure of row + box', () => {
    fc.assert(
      fc.property(row, permission, (start, p) => {
        const closed = closePermissions(start, HR_PERMISSION_REQUIRES, HR_PERMISSIONS);
        const ticked = togglePermission(closed, p, true, HR_PERMISSION_REQUIRES, HR_PERMISSIONS);
        expect(sorted(ticked)).toEqual(sorted(backendClosure([...closed, p])));
      }),
    );
  });
});
