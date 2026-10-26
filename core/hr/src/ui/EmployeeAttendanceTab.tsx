import { useState } from 'react';
import {
  Alert,
  Box,
  CenteredLoader,
  MonthPicker,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { currentMonth, formatMonth, type EmployeeResponse } from '@inventory-platform/hr/types';
import { useMonthRegisterQuery } from '../queries/hooks';
import { AttendanceCalendar } from './AttendanceCalendar';

export interface EmployeeAttendanceTabProps {
  employee: EmployeeResponse;
}

/** One employee's month as a calendar (R5.11), from `GET /attendance/month?employeeId=`. */
export function EmployeeAttendanceTab({ employee }: EmployeeAttendanceTabProps) {
  const thisMonth = currentMonth();
  const [period, setPeriod] = useState(thisMonth);
  const month = useMonthRegisterQuery(period, employee.id);
  const row = month.data?.rows.find((r) => r.employeeId === employee.id);
  const dates = month.data?.dates ?? [];

  return (
    <Stack gap="md">
      <Box className={hrChrome.hrPageToolbar}>
        <MonthPicker value={period} onChange={setPeriod} max={thisMonth} label="Month" />
      </Box>
      {month.data?.locked ? (
        <Alert variant="info">Payroll for {formatMonth(period)} is finalised.</Alert>
      ) : null}
      {month.error ? <Alert variant="danger">{month.error.message}</Alert> : null}
      {month.isLoading ? (
        <CenteredLoader label="Loading attendance…" />
      ) : row ? (
        <AttendanceCalendar
          period={period}
          row={row}
          dates={dates}
          caption={`${employee.name}, ${formatMonth(period)}`}
        />
      ) : !month.error ? (
        <Text color="muted">
          {employee.name} was not employed in {formatMonth(period)}.
        </Text>
      ) : null}
    </Stack>
  );
}
