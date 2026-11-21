import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  daysInMonth,
  formatIsoDate,
  isoWeekday,
  parseYearMonth,
} from './calendarDate';
import styles from './CalendarMonthGrid.module.css';

export interface CalendarDay {
  /** 'yyyy-MM-dd' */
  date: string;
  /** 1..31 */
  dayOfMonth: number;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
}

export interface CalendarMonthGridProps {
  /** Month to show as 'YYYY-MM'. */
  month: string;
  /** Content of one day cell (e.g. the day number plus an `AttendanceCell`). */
  renderDay: (day: CalendarDay) => ReactNode;
  /** Table caption read by screen readers; defaults to "<Month> <Year>". */
  caption?: string;
  /** Shows the caption visually as well (hidden by default because pages show their own title). */
  showCaption?: boolean;
  className?: string;
}

/** Splits a month into Monday-first weeks; `null` marks blank cells before day 1 and after the last day. */
export function buildMonthWeeks(month: string): Array<Array<CalendarDay | null>> {
  const ym = parseYearMonth(month);
  if (!ym) return [];
  const total = daysInMonth(ym);
  const cells: Array<CalendarDay | null> = [];
  const first = new Date(Date.UTC(ym.year, ym.month - 1, 1));
  // Leading blanks: Monday-start means a month starting on Wednesday (ISO 3) gets 2 blanks.
  for (let i = 1; i < isoWeekday(first); i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) {
    const date = new Date(Date.UTC(ym.year, ym.month - 1, d));
    cells.push({ date: formatIsoDate(date), dayOfMonth: d, weekday: isoWeekday(date) });
  }
  // Trailing blanks complete the last week so every row has 7 cells.
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Seven-column month calendar (weeks start on Monday) rendered as a table, with a render prop
 * for each day. Blank cells before the 1st and after the last day are empty and hidden from
 * screen readers.
 */
export function CalendarMonthGrid({
  month,
  renderDay,
  caption,
  showCaption = false,
  className,
}: CalendarMonthGridProps) {
  const ym = parseYearMonth(month);
  const weeks = buildMonthWeeks(month);
  const captionText = caption ?? (ym ? `${MONTH_NAMES[ym.month - 1]} ${ym.year}` : month);

  return (
    <table className={cn(styles.table, className)}>
      <caption className={showCaption ? styles.caption : styles.captionHidden}>
        {captionText}
      </caption>
      <thead>
        <tr>
          {WEEKDAY_NAMES.map((name) => (
            <th key={name} scope="col" abbr={name} className={styles.weekday}>
              {name.slice(0, 3)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, weekIndex) => (
          <tr key={week.find(Boolean)?.date ?? weekIndex}>
            {week.map((day, dayIndex) =>
              day ? (
                <td key={day.date} className={styles.day} data-date={day.date}>
                  {renderDay(day)}
                </td>
              ) : (
                <td
                  key={`blank-${weekIndex}-${dayIndex}`}
                  className={styles.blank}
                  aria-hidden="true"
                />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
