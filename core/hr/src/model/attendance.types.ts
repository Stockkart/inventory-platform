/**
 * Attendance DTOs, 1:1 with `com.inventory.hr.rest.dto` (`AttendanceController`). Dates are
 * `yyyy-MM-dd`, months `YYYY-MM`, times `HH:mm`, instants ISO strings; BigDecimal → number.
 *
 * The punch-level enums and `PunchResponse` are shared with the Attendance app through
 * `@inventory-platform/attendance-protocol` (design DD1) and re-exported here unchanged. A value
 * the server sends that this build does not know (a newer source or flag) must be rendered as
 * "unknown", never thrown on: use the `*Label()` helpers in `labels.ts`, not the `Record`s.
 */
import type {
  AttendanceSource,
  ManualMarkReason,
  PunchDirection,
  PunchFlag,
  PunchResponse,
  PunchSource,
} from '@inventory-platform/attendance-protocol';

export type {
  AttendanceSource,
  ManualMarkReason,
  PunchDirection,
  PunchFlag,
  PunchResponse,
  PunchSource,
};

/** `DayStatus`: what an employee-day shows after the resolver. Never stored as such. */
export type DayStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'WEEK_OFF'
  | 'HOLIDAY'
  | 'UNMARKED'
  /** Before the join date or after the exit date; not part of the register's totals. */
  | 'NOT_EMPLOYED';

/** `AttendanceStatus`: a stored day mark (Leave and Unmarked are never stored). */
export type StoredAttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'WEEK_OFF' | 'HOLIDAY';

/** Status accepted by `PUT /attendance/days`; `UNMARKED` clears a stored mark. */
export type SaveAttendanceStatus = StoredAttendanceStatus | 'UNMARKED';

/** Fields the registers carry for punch-filled days (left out when false or empty). */
export interface CaptureMarks {
  missingCheckOut?: boolean | null;
  flags?: PunchFlag[] | null;
}

/** `DayStatusResolver.Source`: which rule decided the day's status. */
export type DayStatusSource = 'EMPLOYMENT' | 'LEAVE' | 'MARK' | 'HOLIDAY' | 'WEEK_OFF' | 'NONE';

/** `AttendanceRowResponse`: one resolved employee-day (daily register, save response). */
export interface AttendanceRowResponse extends CaptureMarks {
  employeeId: string;
  code: string;
  name: string;
  /** null = not given. */
  designation?: string | null;
  date: string;
  status: DayStatus;
  source: DayStatusSource;
  /** true = half-day leave; `otherHalf` says what the rest of the day is. */
  halfDayLeave: boolean;
  otherHalf?: DayStatus | null;
  /** Approved leave shown on this day; null = none. */
  leaveRequestId?: string | null;
  late: boolean;
  inTime?: string | null;
  outTime?: string | null;
  workedMinutes?: number | null;
  overtimeMinutes: number;
  autoHalfDay: boolean;
  note?: string | null;
  /** Who stored the mark and when; null = derived day. */
  markedAt?: string | null;
  markedByUserId?: string | null;
  /** The day's month is locked by payroll. */
  locked: boolean;
  /**
   * Where the stored mark came from (a mark without one is MANUAL); null = no mark. Not `source`,
   * which says what decided the status.
   */
  markSource?: AttendanceSource | null;
  /**
   * Source of the day's earliest counted punch (SELF or BIOMETRIC_APP), the register icon when
   * the day is derived (R8.1–R8.2); null = no counted punch. Daily register only; missing on
   * older backends.
   */
  punchSource?: PunchSource | null;
  /**
   * A hand-made mark, change or clear of this day must carry a reason (R7.2): Biometric app
   * check-in is on and the employee has an active paired phone. Missing on older backends (= no).
   */
  markReasonRequired?: boolean | null;
  /**
   * "No punch yet" hint (R7.7–R7.8): today's row, Biometric app check-in on, active paired phone,
   * and neither a punch nor a stored mark. Missing on older backends (= no).
   */
  noPunchYet?: boolean | null;
}

/** `DailyRegisterResponse`: everyone employed on `date`, by name. */
export interface DailyRegisterResponse {
  date: string;
  locked: boolean;
  rows: AttendanceRowResponse[];
}

/** `SaveAttendanceDaysRequest.Row`. */
export interface SaveAttendanceDayRow {
  employeeId: string;
  /** yyyy-MM-dd, not in the future (Asia/Kolkata). */
  date: string;
  status: SaveAttendanceStatus;
  /** HH:mm; optional. */
  inTime?: string | null;
  /** HH:mm; optional, after inTime. */
  outTime?: string | null;
  note?: string | null;
  /**
   * Why the day is marked by hand (R7.2–R7.3). The server requires it only when the row's
   * `markReasonRequired` is true at save time; when given anyway it is still recorded in history.
   */
  reason?: ManualMarkReason | null;
  /** Free text for `OTHER`: 1–{@link MAX_MARK_REASON_TEXT_LENGTH} characters after trimming. */
  reasonText?: string | null;
}

/** `SaveAttendanceDaysRequest`: up to {@link MAX_ATTENDANCE_ROWS} rows per call. */
export interface SaveAttendanceDaysRequest {
  rows: SaveAttendanceDayRow[];
}

/** `MarkUnmarkedPresentRequest`. */
export interface MarkUnmarkedPresentRequest {
  /** 1 to 31 dates of one month, none in the future. */
  dates: string[];
  /** null or empty = every employee employed on those dates. */
  employeeIds?: string[] | null;
  /**
   * One reason for the whole call (R7.2–R7.3); required only when Biometric app check-in is on
   * and at least one employee being marked has an active paired phone.
   */
  reason?: ManualMarkReason | null;
  /** Free text for `OTHER`: 1–{@link MAX_MARK_REASON_TEXT_LENGTH} characters after trimming. */
  reasonText?: string | null;
}

/** `MarkUnmarkedPresentResponse`. */
export interface MarkUnmarkedPresentResponse {
  marked: number;
}

/** `MonthRegisterResponse.Cell`; flags that are false are left out by the server. */
export interface MonthRegisterCell extends CaptureMarks {
  status: DayStatus;
  /** Where the stored mark came from when it is not a hand-made one; left out otherwise. */
  markSource?: AttendanceSource | null;
  late?: boolean | null;
  halfDayLeave?: boolean | null;
  /** Half-day leave only. */
  otherHalf?: DayStatus | null;
  /**
   * The date is after today (Asia/Kolkata), whatever the status (run B6); left out when false. A
   * future Unmarked day is not counted in `totals.unmarked` and is shown blank.
   */
  future?: boolean | null;
}

/** `MonthRegisterResponse.Totals`; halves come from half-day leave, NOT_EMPLOYED not counted. */
export interface MonthRegisterTotals {
  present: number;
  halfDays: number;
  absent: number;
  leave: number;
  weekOff: number;
  holiday: number;
  unmarked: number;
  lateDays: number;
  workedMinutes: number;
  overtimeMinutes: number;
}

/** `MonthRegisterResponse.Row`. */
export interface MonthRegisterRow {
  employeeId: string;
  code: string;
  name: string;
  /**
   * A hand-made mark, change or clear of any of this employee's days must carry a reason (R7.2),
   * as of this read. Missing on older backends (= no).
   */
  markReasonRequired?: boolean | null;
  /** Same order as `MonthRegisterResponse.dates`. */
  cells: MonthRegisterCell[];
  totals: MonthRegisterTotals;
}

/** `MonthRegisterResponse`: employees × days of one month with totals. */
export interface MonthRegisterResponse {
  period: string;
  locked: boolean;
  /** Every date of the month; cells are in the same order. */
  dates: string[];
  rows: MonthRegisterRow[];
}

/** `HrAuditAction`. */
export type HrAuditAction =
  | 'ATTENDANCE_SET'
  | 'ATTENDANCE_BULK_SET'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'PAYROLL_FINALISED'
  | 'PAYROLL_REOPENED'
  | 'SALARY_PAID'
  | 'SALARY_PAYMENT_UNDONE'
  | 'ADVANCE_RECORDED'
  | 'ADVANCE_CANCELLED'
  | 'EMPLOYEE_CHANGED'
  /** Login link set, changed or cleared (run B5). */
  | 'EMPLOYEE_LINK_CHANGED'
  /** Email changed; the payload never holds the address (run B5). */
  | 'EMPLOYEE_EMAIL_CHANGED'
  | 'SETTINGS_CHANGED'
  | 'ROLE_PERMISSIONS_CHANGED'
  /** Attendance app pairing (R2.17, R3.1, R3.6, R3.9); payloads never hold a key or installation id. */
  | 'PAIRING_CODE_CREATED'
  | 'DEVICE_PAIRED'
  | 'DEVICE_REPLACED'
  | 'DEVICE_UNPAIRED'
  | 'DEVICE_CONSENT_UPDATED'
  /** Worker join requests and the pairing rule (worker-app R4.11, R7.3, R8.7). */
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'PAIRING_CODE_REFUSED'
  | 'PROFILE_REQUESTED';

/** `AuditEventResponse`: payloads are already stripped of PII and pay. */
export interface AuditEventResponse {
  action: HrAuditAction;
  actorUserId?: string | null;
  /** Display name of the actor; null = unknown login (run B4). */
  actorName?: string | null;
  at: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

/** `AttendanceHistoryResponse`: first mark (on the day itself) and later changes, newest first. */
export interface AttendanceHistoryResponse {
  employeeId: string;
  date: string;
  /** Current stored mark; null = nothing stored. */
  status?: StoredAttendanceStatus | null;
  source?: AttendanceSource | null;
  markedAt?: string | null;
  markedByUserId?: string | null;
  /** Display name of `markedByUserId` (the first marker); null = unknown login (run B4). */
  actorName?: string | null;
  events?: AuditEventResponse[] | null;
}

/** `AttendanceDayValidator` limits. */
export const MAX_ATTENDANCE_ROWS = 500;
export const MAX_ATTENDANCE_NOTE_LENGTH = 200;
/** Free-text reason limit of the hand-mark prompt (R7.3). */
export const MAX_MARK_REASON_TEXT_LENGTH = 200;
