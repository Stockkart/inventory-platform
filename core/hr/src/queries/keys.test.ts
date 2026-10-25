import { describe, expect, it } from 'vitest';
import { hrKeys } from './keys';

describe('hrKeys', () => {
  const SHOP = 'shop-42';

  // Every builder except the domain root, called with representative arguments.
  const builders: Array<[string, readonly unknown[]]> = [
    ['shop', hrKeys.shop(SHOP)],
    ['settings', hrKeys.settings(SHOP)],
    ['setupStatus', hrKeys.setupStatus(SHOP)],
    ['rolePermissions', hrKeys.rolePermissions(SHOP)],
    ['holidays', hrKeys.holidays(SHOP, 2026)],
    ['leaveTypes', hrKeys.leaveTypes(SHOP)],
    ['employees', hrKeys.employees(SHOP)],
    ['employeeList', hrKeys.employeeList(SHOP, { q: 'ra', page: 1 })],
    ['employee', hrKeys.employee(SHOP, 'e1')],
    ['designations', hrKeys.designations(SHOP)],
    ['linkableLogins', hrKeys.linkableLogins(SHOP)],
    ['attendance', hrKeys.attendance(SHOP)],
    ['attendanceDaily', hrKeys.attendanceDaily(SHOP, '2026-10-06')],
    ['attendanceMonth', hrKeys.attendanceMonth(SHOP, '2026-10', 'e1')],
    ['attendanceHistory', hrKeys.attendanceHistory(SHOP, 'e1', '2026-10-06')],
    ['leave', hrKeys.leave(SHOP)],
    ['leaveRequests', hrKeys.leaveRequests(SHOP, { status: 'PENDING' })],
    [
      'leavePreview',
      hrKeys.leavePreview(SHOP, { employeeId: 'e1', leaveTypeId: 't1', from: 'a', to: 'b' }),
    ],
    ['leaveBalances', hrKeys.leaveBalances(SHOP, '2026')],
    ['employeeOptions', hrKeys.employeeOptions(SHOP)],
    ['advances', hrKeys.advances(SHOP)],
    ['advanceList', hrKeys.advanceList(SHOP, 'e1')],
    ['advanceStatement', hrKeys.advanceStatement(SHOP, 'e1')],
    ['payroll', hrKeys.payroll(SHOP)],
    ['payrollRuns', hrKeys.payrollRuns(SHOP)],
    ['payrollRun', hrKeys.payrollRun(SHOP, 'run1')],
    ['payrollUnmarked', hrKeys.payrollUnmarked(SHOP, 'run1')],
    ['me', hrKeys.me(SHOP)],
    ['meProfile', hrKeys.meProfile(SHOP)],
    ['meAttendance', hrKeys.meAttendance(SHOP, '2026-10')],
    ['meLeave', hrKeys.meLeave(SHOP, '2026')],
    ['meLeavePreview', hrKeys.meLeavePreview(SHOP, { leaveTypeId: 't1', from: 'a', to: 'b' })],
    ['mePayslips', hrKeys.mePayslips(SHOP)],
    ['notifications', hrKeys.notifications(SHOP)],
  ];

  it.each(builders)('%s starts with ["hr", shopId]', (_name, key) => {
    expect(key.slice(0, 2)).toEqual(['hr', SHOP]);
  });

  it('covers every builder on the factory', () => {
    const names = Object.keys(hrKeys).filter((k) => k !== 'all');
    expect(names.sort()).toEqual(builders.map(([n]) => n).sort());
  });

  it('keeps shops apart', () => {
    expect(hrKeys.settings('a')).not.toEqual(hrKeys.settings('b'));
    expect(hrKeys.employee('a', 'e1')).not.toEqual(hrKeys.employee('b', 'e1'));
  });

  it('nests employee keys under the employees sub-tree so one invalidation covers them', () => {
    const prefix = hrKeys.employees(SHOP);
    expect(hrKeys.employeeList(SHOP, {}).slice(0, prefix.length)).toEqual([...prefix]);
    expect(hrKeys.employee(SHOP, 'e1').slice(0, prefix.length)).toEqual([...prefix]);
    expect(hrKeys.designations(SHOP).slice(0, prefix.length)).toEqual([...prefix]);
  });

  it('nests attendance and leave keys under their sub-trees', () => {
    const att = hrKeys.attendance(SHOP);
    for (const key of [
      hrKeys.attendanceDaily(SHOP, '2026-10-06'),
      hrKeys.attendanceMonth(SHOP, '2026-10'),
      hrKeys.attendanceHistory(SHOP, 'e1', '2026-10-06'),
    ]) {
      expect(key.slice(0, att.length)).toEqual([...att]);
    }
    const lv = hrKeys.leave(SHOP);
    for (const key of [
      hrKeys.leaveRequests(SHOP, {}),
      hrKeys.leaveBalances(SHOP),
      hrKeys.leavePreview(SHOP, { employeeId: 'e1', leaveTypeId: 't', from: 'a', to: 'a' }),
    ]) {
      expect(key.slice(0, lv.length)).toEqual([...lv]);
    }
    expect(hrKeys.attendanceMonth('a', '2026-10')).not.toEqual(
      hrKeys.attendanceMonth('b', '2026-10'),
    );
    expect(hrKeys.leaveBalances('a')).not.toEqual(hrKeys.leaveBalances('b'));
  });

  it('nests advance and payroll keys under their sub-trees (run F4)', () => {
    const adv = hrKeys.advances(SHOP);
    for (const key of [hrKeys.advanceList(SHOP), hrKeys.advanceStatement(SHOP, 'e1')]) {
      expect(key.slice(0, adv.length)).toEqual([...adv]);
    }
    const pay = hrKeys.payroll(SHOP);
    for (const key of [
      hrKeys.payrollRuns(SHOP),
      hrKeys.payrollRun(SHOP, 'run1'),
      hrKeys.payrollUnmarked(SHOP, 'run1'),
    ]) {
      expect(key.slice(0, pay.length)).toEqual([...pay]);
    }
    const emp = hrKeys.employees(SHOP);
    expect(hrKeys.employeeOptions(SHOP).slice(0, emp.length)).toEqual([...emp]);
    expect(hrKeys.payrollRun('a', 'run1')).not.toEqual(hrKeys.payrollRun('b', 'run1'));
    expect(hrKeys.advanceList('a')).not.toEqual(hrKeys.advanceList('b'));
  });

  it('nests self-service keys under `me`, but keeps the inbox outside it (run F5)', () => {
    const me = hrKeys.me(SHOP);
    for (const key of [
      hrKeys.meProfile(SHOP),
      hrKeys.meAttendance(SHOP, '2026-10'),
      hrKeys.meLeave(SHOP),
      hrKeys.mePayslips(SHOP),
    ]) {
      expect(key.slice(0, me.length)).toEqual([...me]);
    }
    expect(hrKeys.notifications(SHOP).slice(0, me.length)).not.toEqual([...me]);
    expect(hrKeys.notifications('a')).not.toEqual(hrKeys.notifications('b'));
    // Per-employee balances do not collide with the shop list.
    expect(hrKeys.leaveBalances(SHOP, null, 'e1')).not.toEqual(hrKeys.leaveBalances(SHOP));
  });
});
