import type { HrPermission } from '@inventory-platform/access';
import type { DayStatus, HrAuditAction } from './attendance.types';
import type { EmployeeStatus, HrPaymentMethod, PayType } from './employee.types';
import type { LeaveRequestStatus } from './leave.types';
import type { AdvanceStatus } from './advance.types';
import type { ManualItemKind, PayrollRunStatus, SalaryPaymentStatus } from './payroll.types';
import type { DayOfWeek, HrGridRole, LeaveYearStartMonth, PerDayBasis } from './settings.types';

/** Plain-English permission names (R1.1), in the backend enum order. */
export const HR_PERMISSION_LABELS: Record<HrPermission, string> = {
  VIEW_ATTENDANCE: 'View all attendance',
  MARK_ATTENDANCE: 'Mark and fix attendance',
  APPROVE_LEAVE: 'Approve leave',
  VIEW_EMPLOYEES: 'View employees',
  ADD_EDIT_EMPLOYEES: 'Add and edit employees',
  VIEW_SALARIES: 'View salaries',
  RUN_PAYROLL: 'Run payroll',
  RECORD_PAYMENTS: 'Record salary payments',
  MANAGE_ADVANCES: 'Manage advances',
  MANAGE_SETTINGS: 'Manage HR settings and holidays',
};

export const HR_GRID_ROLE_LABELS: Record<HrGridRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export const DAY_LABELS: Record<DayOfWeek, { short: string; long: string }> = {
  MONDAY: { short: 'Mon', long: 'Monday' },
  TUESDAY: { short: 'Tue', long: 'Tuesday' },
  WEDNESDAY: { short: 'Wed', long: 'Wednesday' },
  THURSDAY: { short: 'Thu', long: 'Thursday' },
  FRIDAY: { short: 'Fri', long: 'Friday' },
  SATURDAY: { short: 'Sat', long: 'Saturday' },
  SUNDAY: { short: 'Sun', long: 'Sunday' },
};

export const PER_DAY_BASIS_LABELS: Record<PerDayBasis, string> = {
  CALENDAR_DAYS: 'Days in the month',
  FIXED_30: 'Always 30 days',
  FIXED_26: 'Always 26 days',
};

export const LEAVE_YEAR_LABELS: Record<LeaveYearStartMonth, string> = {
  JANUARY: 'January',
  APRIL: 'April',
};

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  MONTHLY: 'Monthly salary',
  DAILY: 'Daily wage',
};

export const PAYMENT_METHOD_LABELS: Record<HrPaymentMethod, string> = {
  CASH: 'Cash',
  BANK: 'Bank transfer',
  UPI: 'UPI',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  EXITED: 'Exited',
};

/** Day status words (R13.3); same words as `ATTENDANCE_STATUS_META` in ui-kit. */
export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half-day',
  LEAVE: 'Leave',
  WEEK_OFF: 'Week-off',
  HOLIDAY: 'Holiday',
  UNMARKED: 'Unmarked',
  NOT_EMPLOYED: 'Not employed',
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/** History lines on the attendance day detail. */
export const AUDIT_ACTION_LABELS: Partial<Record<HrAuditAction, string>> = {
  ATTENDANCE_SET: 'Mark changed',
  ATTENDANCE_BULK_SET: 'Marked with others',
  LEAVE_APPROVED: 'Leave approved',
  LEAVE_REJECTED: 'Leave rejected',
  LEAVE_CANCELLED: 'Leave cancelled',
  EMPLOYEE_LINK_CHANGED: 'Login link changed',
  EMPLOYEE_EMAIL_CHANGED: 'Email changed',
};

export const ADVANCE_STATUS_LABELS: Record<AdvanceStatus, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
};

/** Run status chips; the two claim states are said in plain words. */
export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  DRAFT: 'Draft',
  FINALISING: 'Being finalised',
  FINALISED: 'Finalised',
  REOPENING: 'Being reopened',
};

/** Payment column of a finalised run; PAYING/UNDOING are short claims. */
export const SALARY_PAYMENT_STATUS_LABELS: Record<SalaryPaymentStatus, string> = {
  PENDING: 'Pending',
  PAYING: 'Being paid',
  PAID: 'Paid',
  UNDOING: 'Being undone',
};

export const MANUAL_ITEM_KIND_LABELS: Record<ManualItemKind, string> = {
  BONUS: 'Bonus or incentive',
  OTHER_DEDUCTION: 'Other deduction',
};

/** Line warnings (`PayrollCalculator`); unknown codes fall back to a generic word. */
export const PAYROLL_WARNING_LABELS: Record<string, string> = {
  NO_SALARY: 'No salary set',
  DEDUCTIONS_EXCEED_PAY: 'Deductions more than pay',
};
