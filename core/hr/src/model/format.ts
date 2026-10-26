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
