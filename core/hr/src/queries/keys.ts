import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  EmployeeListParams,
  LeavePreviewParams,
  LeaveRequestListParams,
  MyLeavePreviewParams,
} from '@inventory-platform/hr/types';

/**
 * HR query keys. Task 13.2 adds the key factory; every key must start with
 * `['hr', shopId, ...]` so cached data never leaks between shops.
 */
const base = createQueryKeyFactory('hr');

/** Everything HR for one shop; mutations invalidate this sub-tree. */
const shop = (shopId: string) => [...base.all, shopId] as const;
const employees = (shopId: string) => [...shop(shopId), 'employees'] as const;
/** Daily/month registers and day history; attendance and leave writes invalidate this. */
const attendance = (shopId: string) => [...shop(shopId), 'attendance'] as const;
/** Leave lists, previews and balances; leave writes invalidate this. */
const leave = (shopId: string) => [...shop(shopId), 'leave'] as const;
/** Advance lists and statements; advance and payroll writes invalidate this. */
const advances = (shopId: string) => [...shop(shopId), 'advances'] as const;
/** Payroll runs, lines and unmarked lists; payroll, advance and attendance writes invalidate it. */
const payroll = (shopId: string) => [...shop(shopId), 'payroll'] as const;
/**
 * Self-service (run F5): own profile, attendance, leave and payslips. Own leave writes refresh it;
 * staff attendance, leave and payroll writes do too (they change what My HR shows).
 */
const me = (shopId: string) => [...shop(shopId), 'me'] as const;

export const hrKeys = {
  ...base,
  shop,
  settings: (shopId: string) => [...shop(shopId), 'settings'] as const,
  setupStatus: (shopId: string) => [...shop(shopId), 'setup-status'] as const,
  rolePermissions: (shopId: string) => [...shop(shopId), 'role-permissions'] as const,
  holidays: (shopId: string, year: number) => [...shop(shopId), 'holidays', year] as const,
  leaveTypes: (shopId: string) => [...shop(shopId), 'leave-types'] as const,
  employees,
  employeeList: (shopId: string, params: EmployeeListParams) =>
    [...employees(shopId), 'list', params] as const,
  employee: (shopId: string, id: string) => [...employees(shopId), 'detail', id] as const,
  designations: (shopId: string) => [...employees(shopId), 'designations'] as const,
  /** Every employee (all pages) for pickers; nested so employee writes refresh it. */
  employeeOptions: (shopId: string) => [...employees(shopId), 'options'] as const,
  linkableLogins: (shopId: string) => [...shop(shopId), 'linkable-logins'] as const,
  attendance,
  attendanceDaily: (shopId: string, date: string) =>
    [...attendance(shopId), 'daily', date] as const,
  /** `employeeId` null = every employee (register); an id = one employee's calendar. */
  attendanceMonth: (shopId: string, period: string, employeeId: string | null = null) =>
    [...attendance(shopId), 'month', period, employeeId] as const,
  attendanceHistory: (shopId: string, employeeId: string, date: string) =>
    [...attendance(shopId), 'history', employeeId, date] as const,
  leave,
  leaveRequests: (shopId: string, params: LeaveRequestListParams) =>
    [...leave(shopId), 'requests', params] as const,
  leavePreview: (shopId: string, params: LeavePreviewParams) =>
    [...leave(shopId), 'preview', params] as const,
  /** `year` null = the current leave year; `employeeId` null = every employee. */
  leaveBalances: (shopId: string, year: string | null = null, employeeId: string | null = null) =>
    [...leave(shopId), 'balances', year, employeeId] as const,
  advances,
  /** `employeeId` null = the shop's newest 500. */
  advanceList: (shopId: string, employeeId: string | null = null) =>
    [...advances(shopId), 'list', employeeId] as const,
  advanceStatement: (shopId: string, employeeId: string) =>
    [...advances(shopId), 'statement', employeeId] as const,
  payroll,
  payrollRuns: (shopId: string) => [...payroll(shopId), 'runs'] as const,
  payrollRun: (shopId: string, runId: string) => [...payroll(shopId), 'run', runId] as const,
  payrollUnmarked: (shopId: string, runId: string) =>
    [...payroll(shopId), 'unmarked', runId] as const,
  me,
  meProfile: (shopId: string) => [...me(shopId), 'profile'] as const,
  meAttendance: (shopId: string, period: string) => [...me(shopId), 'attendance', period] as const,
  /** `year` null = the current leave year. */
  meLeave: (shopId: string, year: string | null = null) => [...me(shopId), 'leave', year] as const,
  meLeavePreview: (shopId: string, params: MyLeavePreviewParams) =>
    [...me(shopId), 'leave-preview', params] as const,
  mePayslips: (shopId: string) => [...me(shopId), 'payslips'] as const,
  /**
   * The inbox (items gathered so far + cursor). Outside the `me` sub-tree on purpose: writes
   * refresh `me`, but the inbox only moves forward by its own polls.
   */
  notifications: (shopId: string) => [...shop(shopId), 'notifications'] as const,
};

export const HR_MODULE_VERSION = '0.1.0';
