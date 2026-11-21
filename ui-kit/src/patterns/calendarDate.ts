/**
 * Small calendar helpers for MonthPicker, DateStepper and CalendarMonthGrid.
 * All maths runs on UTC dates so daylight-saving shifts never move a day; values are plain
 * strings ('YYYY-MM' months, 'yyyy-MM-dd' days) exactly as the API sends them.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Monday-first weekday names (ISO weekday 1..7 maps to index 0..6). */
export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface YearMonth {
  year: number;
  /** 1..12 */
  month: number;
}

/** Parses 'YYYY-MM'; returns null for anything else so callers can fall back. */
export function parseYearMonth(value: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}-${pad2(month)}`;
}

/** Adds `delta` months, rolling the year over (e.g. 2026-12 + 1 = 2027-01). */
export function addMonths(value: YearMonth, delta: number): YearMonth {
  const index = value.year * 12 + (value.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Zero-padded ISO text ('YYYY-MM' or 'yyyy-MM-dd') compares correctly as plain strings. */
export function compareIsoText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Parses 'yyyy-MM-dd' to a UTC date; null when the text is not a real calendar day. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  // Date.UTC silently rolls 2026-02-31 into March; reject such values.
  return formatIsoDate(date) === value ? date : null;
}

export function formatIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function addDays(value: string, delta: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + delta);
  return formatIsoDate(date);
}

/** Today in the browser's local time zone as 'yyyy-MM-dd'. */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function daysInMonth({ year, month }: YearMonth): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a UTC date. */
export function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}
