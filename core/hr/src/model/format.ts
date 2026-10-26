import type { PayType } from './employee.types';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** ₹ amount in Indian grouping (₹1,23,456.50); `—` when unknown. */
export function formatInr(amount: number | null | undefined): string {
  return amount == null ? '—' : INR.format(amount);
}

/** "₹14,500 a month" / "₹600 a day". */
export function formatPay(payType: PayType | null | undefined, amount: number | null | undefined) {
  if (amount == null) return '—';
  return `${formatInr(amount)} ${payType === 'DAILY' ? 'a day' : 'a month'}`;
}

const MONTH_NAMES = [
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
];

/** `2026-04` → "April 2026"; anything else is returned unchanged. */
export function formatMonth(period: string | null | undefined): string {
  if (!period) return '—';
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  return `${MONTH_NAMES[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** `2026-04-09` → "9 Apr 2026" (parsed as a calendar date, never shifted by time zone). */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const month = MONTH_NAMES[Number(m[2]) - 1]?.slice(0, 3) ?? m[2];
  return `${Number(m[3])} ${month} ${m[1]}`;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Dates a salary month covers, mirroring the backend: start day 1 (or none) = the calendar month;
 * start day d > 1 = day d of the previous month to day d − 1 of `period`'s month. `period` is
 * `YYYY-MM`, start day 1–28 (out-of-range values count as 1).
 */
export function cycleRange(
  period: string,
  startDay: number | null | undefined,
): { from: string; to: string } {
  const [y, m] = period.split('-').map(Number);
  const day =
    startDay && Number.isInteger(startDay) && startDay >= 2 && startDay <= 28 ? startDay : 1;
  if (day === 1) {
    // Day 0 of the next month = last day of this one (UTC: no time-zone shift).
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: iso(y, m, 1), to: iso(y, m, last) };
  }
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return { from: iso(prevY, prevM, day), to: iso(y, m, day - 1) };
}

/** `2026-09-26` → "26 Sep" (formatDate without the year). */
function formatDayMonth(date: string): string {
  return formatDate(date).replace(/ \d{4}$/, '');
}

/** "26 Sep – 25 Oct". */
export function formatDateRange(from: string, to: string): string {
  return `${formatDayMonth(from)} – ${formatDayMonth(to)}`;
}

/** Salary period of a run, line or payslip; old data without dates = the calendar month. */
export function salaryRange(item: {
  period: string;
  fromDate?: string | null;
  toDate?: string | null;
}): { from: string; to: string } {
  return item.fromDate && item.toDate
    ? { from: item.fromDate, to: item.toDate }
    : cycleRange(item.period, 1);
}

/** "October 2026 · 26 Sep – 25 Oct" (calendar month when the item has no dates). */
export function formatSalaryPeriod(item: {
  period: string;
  fromDate?: string | null;
  toDate?: string | null;
}): string {
  const { from, to } = salaryRange(item);
  return `${formatMonth(item.period)} · ${formatDateRange(from, to)}`;
}

/** Today's local date as `yyyy-MM-dd`. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Whether a month-register cell is shown blank ("not yet"): the server flags the day as after
 * today (run B6) and nothing is resolved for it. A future holiday, leave or week-off still shows
 * its status. Run F7 worked "future" out client-side; run F8 uses the server flag instead.
 */
export function isBlankFutureCell(cell: { status: string; future?: boolean | null }): boolean {
  return cell.future === true && cell.status === 'UNMARKED';
}

/** This month as `YYYY-MM`. */
export function currentMonth(now: Date = new Date()): string {
  return todayIso(now).slice(0, 7);
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `2026-10-06` → "Mon, 6 Oct" (calendar date, never shifted by time zone). */
export function formatDayShort(date: string | null | undefined): string {
  if (!date) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // UTC keeps the weekday right whatever the browser's time zone is.
  const weekday = WEEKDAY_SHORT[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${weekday}, ${d} ${MONTH_NAMES[mo - 1]?.slice(0, 3) ?? m[2]}`;
}

/** "Mon, 6 Oct" for one day, "Mon, 6 Oct – Wed, 8 Oct" for a range. */
export function formatDayRange(from: string, to: string): string {
  return from === to ? formatDayShort(from) : `${formatDayShort(from)} – ${formatDayShort(to)}`;
}

/** Day counts with halves: 1 → "1 day", 1.5 → "1.5 days"; `null` → "No limit". */
export function formatDays(days: number | null | undefined): string {
  if (days == null) return 'No limit';
  const n = Number.isInteger(days) ? String(days) : days.toFixed(1);
  return `${n} day${days === 1 ? '' : 's'}`;
}

/** 510 → "8 h 30 min"; 0/null → "—". */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** ISO instant → "6 Oct 2026, 9:40 am" in the browser's time zone. */
export function formatDateTime(instant: string | null | undefined): string {
  if (!instant) return '—';
  const d = new Date(instant);
  return Number.isNaN(d.getTime()) ? instant : DATE_TIME.format(d);
}
