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
    { path: '/dashboard/hr/settings', label: 'Settings', icon: 'settings' },
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
      '/dashboard/hr/settings',
    ]);
  });

  it('shows Settings with any HR permission and hides it with none', () => {
    expect(canAccessDashboardPath('/dashboard/hr/settings', withPerms(['VIEW_EMPLOYEES']))).toBe(
      true,
    );
    expect(canAccessDashboardPath('/dashboard/hr/settings', withPerms(['MANAGE_SETTINGS']))).toBe(
      true,
    );
    expect(canAccessDashboardPath('/dashboard/hr/settings', withPerms([], 'emp-1'))).toBe(false);
    expect(
      canAccessDashboardPath('/dashboard/hr/settings', withPerms(['SELF_CHECK_IN'], 'emp-1')),
    ).toBe(false);
    expect(canAccessDashboardPath('/dashboard/hr/settings', access(null))).toBe(false);
    expect(canAccessDashboardPath('/dashboard/hr/settings', null)).toBe(false);
  });

  it('opens the Attendance app privacy note to any HR staff or linked employee (HR-module R9.14)', () => {
    const path = '/dashboard/hr/attendance-app-privacy';
    expect(canAccessDashboardPath(path, withPerms(['VIEW_EMPLOYEES']))).toBe(true);
    expect(canAccessDashboardPath(path, withPerms(['SELF_CHECK_IN']))).toBe(true);
    expect(canAccessDashboardPath(path, withPerms([], 'emp-1'))).toBe(true);
    expect(canAccessDashboardPath(path, withPerms([]))).toBe(false);
    expect(canAccessDashboardPath(path, access(null))).toBe(false);
    expect(canAccessDashboardPath(path, null)).toBe(false);
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
    expect(paths(filterDashboardMenuGroupsByAccess([HR_GROUP], owner))).toHaveLength(7);
  });

  it('leaves non-HR paths as they were', () => {
    expect(canAccessDashboardPath('/dashboard/products', access(null))).toBe(true);
    expect(canAccessDashboardPath('/dashboard/accounting', access(null))).toBe(false);
  });
});

// Feature: worker-app, R2.1, R2.2, R2.5: a WORKER login sees My HR and nothing else.
describe('accessNav for a WORKER login', () => {
  const STAFF_GROUPS: DashboardMenuGroup[] = [
    {
      id: 'products',
      label: 'Products',
      icon: 'package',
      items: [
        { path: '/dashboard/products', label: 'Products', icon: 'package' },
        { path: '/dashboard/scan-sell', label: 'Scan and sell', icon: 'smartphone' },
      ],
    } as DashboardMenuGroup,
    {
      id: 'team',
      label: 'Team',
      icon: 'users',
      items: [
        { path: '/dashboard/shop-users', label: 'Users', icon: 'users' },
        { path: '/dashboard/my-invitations', label: 'My invitations', icon: 'inbox' },
      ],
    } as DashboardMenuGroup,
    HR_GROUP,
  ];

  // Everything a generous (buggy or stale) backend could switch on: the role alone decides.
  function worker(employeeId: string | null): ShopAccess {
    const a = access({ permissions: ['VIEW_EMPLOYEES', 'RUN_PAYROLL'], employeeId });
    a.role = 'WORKER';
    a.canManageAccess = true;
    a.modules = {
      accounting: true,
      analytics: true,
      mis: true,
      taxes: true,
      stockCorrection: true,
      marketing: true,
      paymentPlan: true,
      productSearchEdit: true,
      rateRulesEdit: true,
      hr: true,
    };
    a.team = {
      manageInvitations: true,
      manageJoinRequests: true,
      manageShopUsers: true,
      viewMyInvitations: true,
    };
    return a;
  }

  const EVERY_OTHER_PATH = [
    '/dashboard',
    '/dashboard/products',
    '/dashboard/scan-sell',
    '/dashboard/profile',
    '/dashboard/shops',
    '/dashboard/shop-users',
    '/dashboard/my-invitations',
    '/dashboard/access-control',
    '/dashboard/accounting',
    '/dashboard/plan-status',
    '/dashboard/hr',
    '/dashboard/hr/employees',
    '/dashboard/hr/attendance',
    '/dashboard/hr/leave',
    '/dashboard/hr/payroll',
    '/dashboard/hr/advances',
    '/dashboard/hr/settings',
    '/dashboard/hr/attendance-app-privacy',
    '/dashboard/hr/meX',
  ];

  it('shows only My HR in the menu, whatever the shop switched on', () => {
    expect(paths(filterDashboardMenuGroupsByAccess(STAFF_GROUPS, worker('emp-1')))).toEqual([
      '/dashboard/hr/me',
    ]);
    // No "Access control" is appended for the team group either.
    expect(filterDashboardMenuGroupsByAccess(STAFF_GROUPS, worker('emp-1'))).toHaveLength(1);
  });

  it('shows only My HR before access has loaded when the session role is WORKER', () => {
    expect(paths(filterDashboardMenuGroupsByAccess(STAFF_GROUPS, null, 'WORKER'))).toEqual([
      '/dashboard/hr/me',
    ]);
    // Staff roles keep today's behaviour: ungated items while access loads.
    expect(paths(filterDashboardMenuGroupsByAccess(STAFF_GROUPS, null, 'MANAGER'))).toEqual([
      '/dashboard/products',
      '/dashboard/scan-sell',
      '/dashboard/my-invitations',
    ]);
  });

  it('opens My HR to a WORKER, linked or not, and denies every other path', () => {
    expect(canAccessDashboardPath('/dashboard/hr/me', worker('emp-1'))).toBe(true);
    // Not linked yet: the shell shows the "not part of a shop yet" page there (R2.2).
    expect(canAccessDashboardPath('/dashboard/hr/me', worker(null))).toBe(true);
    expect(canAccessDashboardPath('/dashboard/hr/me', null, 'WORKER')).toBe(true);
    for (const path of EVERY_OTHER_PATH) {
      expect(canAccessDashboardPath(path, worker('emp-1')), path).toBe(false);
      expect(canAccessDashboardPath(path, null, 'WORKER'), path).toBe(false);
    }
  });

  it('does not change a staff login whose access happens to carry the same flags', () => {
    const manager = worker('emp-1');
    manager.role = 'MANAGER';
    expect(canAccessDashboardPath('/dashboard/hr/employees', manager)).toBe(true);
    expect(canAccessDashboardPath('/dashboard/accounting', manager, 'MANAGER')).toBe(true);
  });
});
