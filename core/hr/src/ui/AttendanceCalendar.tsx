import { Box, CalendarMonthGrid, Stack, Text, hrChrome } from '@inventory-platform/ui-kit';
import {
  formatDayShort,
  isBlankFutureCell,
  type MonthRegisterRow,
} from '@inventory-platform/hr/types';
import { AttendanceLegend, AttendanceMark } from './AttendanceMark';

export interface AttendanceCalendarProps {
  /** YYYY-MM. */
  period: string;
  /** One employee's row of a month register. */
  row: MonthRegisterRow;
  /** `MonthRegisterResponse.dates`, same order as `row.cells`. */
  dates: readonly string[];
  caption: string;
}

/**
 * One employee's month as a calendar with the month's totals and the colour key (R5.11). Shared by
 * the employee page Attendance tab and My HR.
 */
export function AttendanceCalendar({ period, row, dates, caption }: AttendanceCalendarProps) {
  const t = row.totals;
  return (
    <Stack gap="sm">
      <CalendarMonthGrid
        month={period}
        caption={caption}
        renderDay={(day) => {
          const cell = row.cells[dates.indexOf(day.date)];
          return (
            <Box className={hrChrome.hrCalendarDay}>
              <Text as="span" className={hrChrome.hrCalendarDayNumber} aria-hidden>
                {day.dayOfMonth}
              </Text>
              {cell ? (
                <AttendanceMark
                  status={cell.status}
                  late={cell.late ?? false}
                  context={formatDayShort(day.date)}
                  future={isBlankFutureCell(cell)}
                />
              ) : null}
            </Box>
          );
        }}
      />
      {t ? (
        <Text variant="caption" color="secondary">
          Present {t.present} · Half-days {t.halfDays} · Leave {t.leave} · Absent {t.absent} ·
          Week-off {t.weekOff} · Holiday {t.holiday} · Unmarked {t.unmarked} · Late {t.lateDays}
        </Text>
      ) : null}
      <AttendanceLegend />
    </Stack>
  );
}
