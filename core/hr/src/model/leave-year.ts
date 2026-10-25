import type { LeaveYearStartMonth } from './settings.types';

/**
 * Leave-year names as the backend builds them (`LeaveYearUtils`): a January year is "2026", an
 * April year runs 1 April – 31 March and is "2026-27".
 */
export function leaveYearOf(date: string, start: LeaveYearStartMonth | null | undefined): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (start !== 'APRIL') return String(year);
  return fiscalName(month >= 4 ? year : year - 1);
}

/** The leave year of `today` and the `count - 1` years before it, newest first. */
export function recentLeaveYears(
  today: string,
  start: LeaveYearStartMonth | null | undefined,
  count = 3,
): string[] {
  const current = leaveYearOf(today, start);
  const first = Number(current.slice(0, 4));
  return Array.from({ length: count }, (_, i) =>
    start === 'APRIL' ? fiscalName(first - i) : String(first - i),
  );
}

function fiscalName(firstYear: number): string {
  return `${firstYear}-${String((firstYear + 1) % 100).padStart(2, '0')}`;
}
