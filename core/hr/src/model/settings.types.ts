/**
 * HR settings, holidays, leave types, role grid and setup status — mirrors the backend DTOs in
 * `com.inventory.hr.rest.dto` (TS type named after the Java class). Dates are `yyyy-MM-dd`,
 * months `YYYY-MM`, times `HH:mm`; `BigDecimal` arrives as a JSON number.
 */
import type { HrPermission } from '@inventory-platform/access';

/** `java.time.DayOfWeek` names. */
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/** Monday-first, the order the backend and `CalendarMonthGrid` use. */
export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Backend `PerDayBasis`: days a monthly salary is divided by. */
export type PerDayBasis = 'CALENDAR_DAYS' | 'FIXED_30' | 'FIXED_26';

/** Backend `LeaveYearStartMonth`. */
export type LeaveYearStartMonth = 'JANUARY' | 'APRIL';

/** Backend `LeaveSystemDefault`: the three leave types every shop starts with. */
export type LeaveSystemDefault = 'CASUAL' | 'SICK' | 'UNPAID';

/** `HrSettingsResponse.WeeklyOffEntryDto`. */
export interface WeeklyOffEntryDto {
  /** YYYY-MM the days apply from. */
  effectiveFrom?: string | null;
  days?: DayOfWeek[] | null;
}

/** `HrSettingsResponse`: settings with defaults filled in; `saved = false` = nothing stored yet. */
export interface HrSettingsResponse {
  saved: boolean;
  weeklyOffSchedule?: WeeklyOffEntryDto[] | null;
  /** Weekly-off days that apply this month. */
  currentWeeklyOffDays?: DayOfWeek[] | null;
  workStart?: string | null;
  workEnd?: string | null;
  graceMinutes?: number | null;
  halfDayBelowHours?: number | null;
  overtimeEnabled?: boolean | null;
  overtimeMultiplier?: number | null;
  perDayBasis?: PerDayBasis | null;
  leaveYearStartMonth?: LeaveYearStartMonth | null;
  /** Send back on PUT for lost-update protection; null = never saved. */
  revision?: number | null;
  updatedAt?: string | null;
}

/** `UpdateHrSettingsRequest.WeeklyOffChange`. */
export interface WeeklyOffChange {
  /** YYYY-MM the new days apply from. */
  effectiveFrom: string;
  days: DayOfWeek[];
}

/**
 * `UpdateHrSettingsRequest`. Partial: a null/omitted field keeps its current value.
 * `revision` is required once settings have been saved (stale = 409 `HR_CONCURRENT_UPDATE`).
 */
export interface UpdateHrSettingsRequest {
  /** null = weekly off unchanged. */
  weeklyOff?: WeeklyOffChange | null;
  workStart?: string | null;
  workEnd?: string | null;
  graceMinutes?: number | null;
  halfDayBelowHours?: number | null;
  overtimeEnabled?: boolean | null;
  overtimeMultiplier?: number | null;
  perDayBasis?: PerDayBasis | null;
  leaveYearStartMonth?: LeaveYearStartMonth | null;
  revision?: number | null;
}

/** `HrSetupStatusResponse`: what the get-started guide needs (R13.6). */
export interface HrSetupStatusResponse {
  settingsSaved: boolean;
  /** Active employees. */
  employeeCount: number;
  attendanceMarked: boolean;
}

/** `HolidayResponse`. */
export interface HolidayResponse {
  id: string;
  /** yyyy-MM-dd. */
  date: string;
  name: string;
  year?: number | null;
}

/** `SaveHolidayRequest`. */
export interface SaveHolidayRequest {
  /** yyyy-MM-dd. */
  date: string;
  name: string;
}

/** `LeaveTypeResponse`. */
export interface LeaveTypeResponse {
  id: string;
  name: string;
  paid?: boolean | null;
  /** null = no limit. */
  yearlyQuotaDays?: number | null;
  active?: boolean | null;
  /** null = made by the shop. */
  systemDefault?: LeaveSystemDefault | null;
}

/** `SaveLeaveTypeRequest`. */
export interface SaveLeaveTypeRequest {
  name: string;
  paid: boolean;
  /** Days per leave year; null = no limit. */
  yearlyQuotaDays?: number | null;
  /** null = active on create, unchanged on update. */
  active?: boolean | null;
}

/** Roles that have a row in the HR role grid (the owner always has everything). */
export type HrGridRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export const HR_GRID_ROLES: readonly HrGridRole[] = ['ADMIN', 'MANAGER', 'CASHIER'];

/** `HrRolePermissionsResponse`. Backend types are `Map<String, List<String>>`. */
export interface HrRolePermissionsResponse {
  /** Effective row per grid role (stored, else default), permission names in enum order. */
  roles: Partial<Record<HrGridRole, HrPermission[]>>;
  /** Dependency rules the grid auto-ticks: permission → the permissions it needs. */
  requires: Partial<Record<HrPermission, HrPermission[]>>;
  /** null = never saved (all rows are the defaults). */
  updatedAt?: string | null;
}

/** `UpdateHrRolePermissionsRequest`: a role left out keeps its current row. */
export interface UpdateHrRolePermissionsRequest {
  roles: Partial<Record<HrGridRole, HrPermission[]>>;
}
