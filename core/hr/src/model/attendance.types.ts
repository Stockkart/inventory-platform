/**
 * Attendance DTOs, 1:1 with `com.inventory.hr.rest.dto` (`AttendanceController`). Dates are
 * `yyyy-MM-dd`, months `YYYY-MM`, times `HH:mm`, instants ISO strings; BigDecimal → number.
 */

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

/** `AttendanceSource`: where a stored mark came from. */
export type AttendanceSource = 'MANUAL' | 'BULK_PRESENT' | 'SELF_CHECK_IN';

/** Backend `PunchFlag`: marks on a stored punch that managers see. */
export type PunchFlag = 'OUTSIDE_SHOP' | 'LOW_ACCURACY' | 'NO_LOCATION' | 'LOCKED_PERIOD';

/** Backend `PunchDirection`. */
export type PunchDirection = 'IN' | 'OUT';

/** Backend `PunchSource`; only SELF is written today. */
export type PunchSource = 'SELF' | 'DEVICE_FILE' | 'BRIDGE';

/** `PunchResponse`: one recorded moment (`GET /attendance/punches`, `GET /me/punches`). */
export interface PunchResponse {
  id: string;
  employeeId: string;
  /** ISO instant (server time). */
  at: string;
  /** HH:mm of `at`, Asia/Kolkata. */
  time?: string | null;
  /** yyyy-MM-dd. */
  localDate?: string | null;
  direction: PunchDirection;
  source: PunchSource;
  /** Self check-in with location check only; the employee's own coordinates are never sent. */
  distanceMetres?: number | null;
  accuracyMetres?: number | null;
  flags?: PunchFlag[] | null;
  /** false = within 5 minutes of the previous counted punch, so it does not count (R4.2). */
  counted?: boolean | null;
}

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
  | 'ROLE_PERMISSIONS_CHANGED';

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
