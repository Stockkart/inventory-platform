import type { HrPermission } from '@inventory-platform/access';
import type {
  AttendanceSource,
  CaptureMarks,
  DayStatus,
  HrAuditAction,
  ManualMarkReason,
  PunchFlag,
  PunchSource,
} from './attendance.types';
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
  SELF_CHECK_IN: 'Self check-in',
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
  PAIRING_CODE_CREATED: 'Pairing code created',
  DEVICE_PAIRED: 'Phone paired',
  DEVICE_REPLACED: 'Phone replaced',
  DEVICE_UNPAIRED: 'Phone unpaired',
  DEVICE_CONSENT_UPDATED: 'Consent updated',
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

/**
 * The word for a server value this build does not know (a newer enum constant). Rendering it, not
 * throwing, is what keeps an old frontend working against a newer backend (API_CONTRACT CH2).
 */
export const UNKNOWN_LABEL = 'unknown';

/** Punch flags in plain English (R9.2, R8.3); no location and poor accuracy read the same. */
export const PUNCH_FLAG_LABELS: Record<PunchFlag, string> = {
  OUTSIDE_SHOP: 'Outside shop',
  LOW_ACCURACY: 'Location unclear',
  NO_LOCATION: 'Location unclear',
  LOCKED_PERIOD: 'Locked month',
  FAKE_LOCATION: 'Fake location',
  RECORDED_OFFLINE: 'Recorded offline',
};

/** Where a punch came from, as the day drawer says it (R8.5). */
export const PUNCH_SOURCE_LABELS: Record<PunchSource, string> = {
  SELF: 'My HR',
  BIOMETRIC_APP: 'Attendance app',
  DEVICE_FILE: 'Machine file',
  BRIDGE: 'Machine',
};

/** Where a stored day mark came from, as the register icon says it (R8.1). */
export const ATTENDANCE_SOURCE_LABELS: Record<AttendanceSource, string> = {
  MANUAL: 'Hand',
  BULK_PRESENT: 'Hand',
  SELF_CHECK_IN: 'My HR',
  BIOMETRIC_APP: 'Attendance app',
};

/** Quick picks of the hand-mark reason prompt, in the order shown (R7.3). */
export const MANUAL_MARK_REASON_LABELS: Record<ManualMarkReason, string> = {
  FORGOT_PHONE: 'Forgot phone',
  PHONE_NOT_WORKING: 'Phone not working',
  NO_NETWORK: 'No network',
  BIOMETRIC_NOT_WORKING: 'Biometric not working',
  OTHER: 'Other',
};

/** `MANUAL_MARK_REASON_LABELS` as the prompt lists them. */
export const MANUAL_MARK_REASONS: readonly ManualMarkReason[] = [
  'FORGOT_PHONE',
  'PHONE_NOT_WORKING',
  'NO_NETWORK',
  'BIOMETRIC_NOT_WORKING',
  'OTHER',
];

function labelOf<K extends string>(
  table: Record<K, string>,
  value: string | null | undefined,
): string {
  if (value == null) return UNKNOWN_LABEL;
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value as K] : UNKNOWN_LABEL;
}

/** Plain words for a punch flag; `"unknown"` for a flag this build does not know. */
export function punchFlagLabel(flag: string | null | undefined): string {
  return labelOf(PUNCH_FLAG_LABELS, flag);
}

/** Plain words for a punch source; `"unknown"` for one this build does not know. */
export function punchSourceLabel(source: string | null | undefined): string {
  return labelOf(PUNCH_SOURCE_LABELS, source);
}

/** Plain words for a stored mark's source; `"unknown"` for one this build does not know. */
export function attendanceSourceLabel(source: string | null | undefined): string {
  return labelOf(ATTENDANCE_SOURCE_LABELS, source);
}

/** Plain words for a hand-mark reason; `"unknown"` for one this build does not know. */
export function manualMarkReasonLabel(reason: string | null | undefined): string {
  return labelOf(MANUAL_MARK_REASON_LABELS, reason);
}

/**
 * Register chips for a punch-filled day (R8.3): "Missing check-out", "Outside shop", "Location
 * unclear", "Fake location", "Recorded offline", each at most once. The chip set is fixed, so a
 * flag this build does not know adds no chip (the day drawer still lists it as "unknown").
 */
export function captureChips(marks: CaptureMarks): string[] {
  const chips = marks.missingCheckOut ? ['Missing check-out'] : [];
  for (const f of marks.flags ?? []) {
    if (f === 'LOCKED_PERIOD') continue;
    if (!Object.prototype.hasOwnProperty.call(PUNCH_FLAG_LABELS, f)) continue;
    const label = PUNCH_FLAG_LABELS[f];
    if (!chips.includes(label)) chips.push(label);
  }
  return chips;
}
