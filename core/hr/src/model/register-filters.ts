/**
 * Register source icons and the "Source" / "Flagged" filters of the attendance registers
 * (HR-module R8.1–R8.2, R8.10–R8.11). Pure functions over the row and cell shapes the server
 * sends, shared by the daily register, the month register and their tests.
 */
import type { AttendanceSource, CaptureMarks, DayStatus, PunchSource } from './attendance.types';
import { captureChips } from './labels';

/**
 * One register source, one icon (R8.1): `HAND` = a mark made by a person (MANUAL, BULK_PRESENT),
 * `PHONE` = My HR self check-in, `APP` = the Attendance app. Same names as ui-kit's
 * `AttendanceSourceKind`, so a value goes straight to `AttendanceCell`.
 */
export type RegisterSource = 'HAND' | 'PHONE' | 'APP';

/** The "Source" filter options, in the order shown (R8.10). */
export const REGISTER_SOURCES: readonly RegisterSource[] = ['HAND', 'PHONE', 'APP'];

/** Filter option words (R8.10). */
export const REGISTER_SOURCE_LABELS: Record<RegisterSource, string> = {
  HAND: 'Hand',
  PHONE: 'My HR',
  APP: 'Attendance app',
};

/** The filter bar state; `sources` empty and `flaggedOnly` false = nothing filtered. */
export interface RegisterFilters {
  /** Days must have a counted punch or hand-made mark of at least one of these (R8.10). */
  sources: readonly RegisterSource[];
  /** Days must show at least one chip (R8.11); daily register only. */
  flaggedOnly: boolean;
}

export const NO_REGISTER_FILTERS: RegisterFilters = { sources: [], flaggedOnly: false };

/** True when the filters would drop any day at all. */
export function hasRegisterFilters(filters: RegisterFilters): boolean {
  return filters.sources.length > 0 || filters.flaggedOnly;
}

/**
 * What one register day exposes about where its mark and punches came from: the daily row
 * (`AttendanceRowResponse`) and the month cell (`MonthRegisterCell`) both fit.
 */
export interface RegisterDay extends CaptureMarks {
  status?: DayStatus | null;
  /**
   * Where the stored mark came from. The daily register sends MANUAL for a hand mark; the month
   * register leaves MANUAL out to keep cells small, so a stored Present / Absent / Half-day with
   * no source is a hand mark too.
   */
  markSource?: AttendanceSource | string | null;
  /** Source of the earliest counted punch of the day (daily register only). */
  punchSource?: PunchSource | string | null;
}

/** Statuses only a stored mark can produce; without a `markSource` word they are hand-made. */
const MARKED_STATUSES: ReadonlySet<string> = new Set(['PRESENT', 'ABSENT', 'HALF_DAY']);

/** Icon for a stored mark's source; null for a source this build does not know. */
export function sourceOfMark(markSource: string | null | undefined): RegisterSource | null {
  switch (markSource) {
    case 'MANUAL':
    case 'BULK_PRESENT':
      return 'HAND';
    case 'SELF_CHECK_IN':
      return 'PHONE';
    case 'BIOMETRIC_APP':
      return 'APP';
    default:
      return null;
  }
}

/** Icon for a punch's source; null for a source this build does not know (or a machine). */
export function sourceOfPunch(punchSource: string | null | undefined): RegisterSource | null {
  switch (punchSource) {
    case 'SELF':
      return 'PHONE';
    case 'BIOMETRIC_APP':
      return 'APP';
    default:
      return null;
  }
}

/** True when the day's shown status comes from a mark a person made (R8.2 "hand always wins"). */
export function hasHandMark(day: RegisterDay): boolean {
  if (day.markSource != null) return sourceOfMark(day.markSource) === 'HAND';
  return day.status != null && MARKED_STATUSES.has(day.status);
}

/**
 * Every source the day carries (R8.10): the hand mark when there is one, the source of the
 * earliest counted punch, and the source of a derived mark. Empty for a day with no mark and no
 * punch.
 */
export function daySources(day: RegisterDay): RegisterSource[] {
  const out: RegisterSource[] = [];
  const add = (s: RegisterSource | null) => {
    if (s && !out.includes(s)) out.push(s);
  };
  if (hasHandMark(day)) add('HAND');
  add(sourceOfPunch(day.punchSource));
  if (day.markSource != null) add(sourceOfMark(day.markSource));
  return out;
}

/**
 * The one icon a register day shows (R8.1–R8.2): the hand when the day has a hand-made mark,
 * else the source of the earliest counted punch, else the source of the derived mark; null when
 * there is no mark and no punch.
 */
export function daySourceIcon(day: RegisterDay): RegisterSource | null {
  if (hasHandMark(day)) return 'HAND';
  return sourceOfPunch(day.punchSource) ?? sourceOfMark(day.markSource);
}

/** The day shows at least one chip (R8.11): the five of `captureChips`. */
export function isFlaggedDay(day: CaptureMarks): boolean {
  return captureChips(day).length > 0;
}

/**
 * The AND of the register filters (R8.10–R8.11): with sources chosen, the day must carry one of
 * them; with "Flagged" on, the day must show a chip. No filter active → every day matches.
 */
export function matchesRegisterFilters(day: RegisterDay, filters: RegisterFilters): boolean {
  if (filters.sources.length > 0) {
    const sources = daySources(day);
    if (!filters.sources.some((s) => sources.includes(s))) return false;
  }
  if (filters.flaggedOnly && !isFlaggedDay(day)) return false;
  return true;
}
