import { describe, expect, it } from 'vitest';
import type { HrAccess, HrPermission, ShopAccess } from '@inventory-platform/access';
import type { DashboardMenuGroup } from '@inventory-platform/routing';
import { canAccessDashboardPath, filterDashboardMenuGroupsByAccess } from './accessNav';

function access(hr: HrAccess | null, overrides: Partial<ShopAccess> = {}): ShopAccess {
  return {
    role: 'MANAGER',
    relationship: 'INVITED',
    owner: false,
    canManageAccess: false,
    productSearch: {
      canView: true,
      canEdit: false,
      editMode: 'FULL_EDIT',
      canEditAll: false,
      editableFields: [],
    },
    stockCorrection: { canCreate: false, canApprove: false },
    modules: {
      accounting: false,
      analytics: false,
      mis: false,
      taxes: false,
      stockCorrection: false,
      marketing: false,
      paymentPlan: false,
      productSearchEdit: false,
      hr: hr != null,
    },
    team: {
      manageInvitations: false,
      manageJoinRequests: false,
      manageShopUsers: false,
      viewMyInvitations: true,
    },
    hr,
    ...overrides,
  };
}

const withPerms = (permissions: HrPermission[], employeeId: string | null = null) =>
  access({ permissions, employeeId });

const HR_GROUP: DashboardMenuGroup = {
  id: 'hr',
  label: 'HR',
  icon: 'users',
  items: [
    { path: '/dashboard/hr/employees', label: 'Employees', icon: 'contact' },
    { path: '/dashboard/hr/attendance', label: 'Attendance', icon: 'calendar' },
    { path: '/dashboard/hr/leave', label: 'Leave', icon: 'inbox' },
    { path: '/dashboard/hr/payroll', label: 'Payroll', icon: 'circle-dollar-sign' },
    { path: '/dashboard/hr/advances', label: 'Advances', icon: 'credit-card' },
    { path: '/dashboard/hr/me', label: 'My HR', icon: 'user' },
  ],
} as DashboardMenuGroup;

const paths = (groups: DashboardMenuGroup[]) => groups.flatMap((g) => g.items.map((i) => i.path));

describe('accessNav HR gating', () => {
  it('hides every HR item until shop access has loaded', () => {
    expect(filterDashboardMenuGroupsByAccess([HR_GROUP], null)).toEqual([]);
    expect(canAccessDashboardPath('/dashboard/hr/employees', null)).toBe(false);
    expect(canAccessDashboardPath('/dashboard/hr/me', undefined)).toBe(false);
  });

  it('shows each item only with its own permission', () => {
    const manager = withPerms([
      'VIEW_ATTENDANCE',
      'MARK_ATTENDANCE',
      'APPROVE_LEAVE',
      'VIEW_EMPLOYEES',
    ]);
    expect(paths(filterDashboardMenuGroupsByAccess([HR_GROUP], manager))).toEqual([
      '/dashboard/hr/employees',
      '/dashboard/hr/attendance',
      '/dashboard/hr/leave',
    ]);
  });

  it('opens payroll with either RUN_PAYROLL or RECORD_PAYMENTS, advances with MANAGE_ADVANCES', () => {
    expect(canAccessDashboardPath('/dashboard/hr/payroll', withPerms(['RUN_PAYROLL']))).toBe(true);
    expect(
      canAccessDashboardPath('/dashboard/hr/payroll/run-1', withPerms(['RECORD_PAYMENTS'])),
    ).toBe(true);
    expect(canAccessDashboardPath('/dashboard/hr/payroll', withPerms(['VIEW_SALARIES']))).toBe(
      false,
    );
    expect(canAccessDashboardPath('/dashboard/hr/advances', withPerms(['MANAGE_ADVANCES']))).toBe(
      true,
    );
    expect(canAccessDashboardPath('/dashboard/hr/advances', withPerms(['RUN_PAYROLL']))).toBe(
      false,
    );
  });

  it('gates nested paths like the employee detail and month register', () => {
    const viewer = withPerms(['VIEW_EMPLOYEES']);
    expect(canAccessDashboardPath('/dashboard/hr/employees/e1', viewer)).toBe(true);
    expect(canAccessDashboardPath('/dashboard/hr/attendance/month', viewer)).toBe(false);
    expect(
      canAccessDashboardPath('/dashboard/hr/attendance/month', withPerms(['VIEW_ATTENDANCE'])),
    ).toBe(true);
    // A look-alike prefix is not the employees page.
    expect(canAccessDashboardPath('/dashboard/hr/employeesX', viewer)).toBe(false);
  });

  it('shows My HR only to a linked employee, even with no permissions or the HR switch off', () => {
    expect(canAccessDashboardPath('/dashboard/hr/me', withPerms([], 'emp-1'))).toBe(true);
    expect(canAccessDashboardPath('/dashboard/hr/me', withPerms(['VIEW_EMPLOYEES']))).toBe(false);
    // Switch off but linked: the backend still returns the HR block with no permissions.
    const switchedOff = access({ permissions: [], employeeId: 'emp-2' });
    switchedOff.modules.hr = false;
    expect(paths(filterDashboardMenuGroupsByAccess([HR_GROUP], switchedOff))).toEqual([
      '/dashboard/hr/me',
    ]);
  });

  it('denies all HR paths when the HR block is missing, and unknown HR paths always', () => {
    const noHr = access(null);
    expect(filterDashboardMenuGroupsByAccess([HR_GROUP], noHr)).toEqual([]);
    const owner = withPerms(
      ['VIEW_EMPLOYEES', 'VIEW_ATTENDANCE', 'RUN_PAYROLL', 'MANAGE_ADVANCES'],
      'emp-9',
    );
    expect(canAccessDashboardPath('/dashboard/hr', owner)).toBe(false);
    expect(canAccessDashboardPath('/dashboard/hr/unknown', owner)).toBe(false);
    expect(paths(filterDashboardMenuGroupsByAccess([HR_GROUP], owner))).toHaveLength(6);
  });

  it('leaves non-HR paths as they were', () => {
    expect(canAccessDashboardPath('/dashboard/products', access(null))).toBe(true);
    expect(canAccessDashboardPath('/dashboard/accounting', access(null))).toBe(false);
  });
});
