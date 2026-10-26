import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  DenseTable,
  DenseTableCell,
  DenseTableHeaderCell,
  DenseTableRow,
  DenseTableSurface,
  EmptyState,
  MonthPicker,
  PageHeader,
  Stack,
  TableBody,
  TableHead,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import {
  DAY_STATUS_LABELS,
  currentMonth,
  formatDayShort,
  formatMonth,
  isBlankFutureCell,
  type MonthRegisterCell,
  type MonthRegisterTotals,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { attendanceApi } from '../api/attendance.api';
import { deliverHrFile } from '../api/download';
import { useHrDownload, useMonthRegisterQuery } from '../queries/hooks';
import { AttendanceDayDrawer } from '../ui/AttendanceDayDrawer';
import { EmployeeNameLink } from '../ui/EmployeeNameLink';
import { HrDownloadAlert } from '../ui/HrDownloadAlert';
import { HrInbox } from '../ui/HrInbox';
import { AttendanceLegend, AttendanceMark, CaptureSourceIcon } from '../ui/AttendanceMark';

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Totals columns, in the order the owner reads a register (R5.12). */
const TOTAL_COLUMNS: Array<{ key: keyof MonthRegisterTotals; label: string }> = [
  { key: 'present', label: 'Present' },
  { key: 'halfDays', label: 'Half' },
  { key: 'leave', label: 'Leave' },
  { key: 'absent', label: 'Absent' },
  { key: 'weekOff', label: 'Week-off' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'unmarked', label: 'Unmarked' },
];

/** 3 → "3", 2.5 → "2.5" (half days come from half-day leave). */
function formatCount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function spoken(name: string, date: string, cell: MonthRegisterCell): string {
  return `${name}, ${formatDayShort(date)}: ${DAY_STATUS_LABELS[cell.status]}${
    cell.late ? ', late' : ''
  }${cell.markSource === 'SELF_CHECK_IN' ? ', by phone' : ''}`;
}

/**
 * Month register (R5.11, R5.12): employees × days with totals per employee. A cell opens the day
 * in a side drawer; its change history is shown to MARK_ATTENDANCE users only (R5.15).
 */
export function AttendanceMonthPage() {
  const navigate = useNavigate();
  const { can } = useHrAccess();
  const canView = can('VIEW_ATTENDANCE');
  const canMark = can('MARK_ATTENDANCE');
  const thisMonth = currentMonth();
  const [period, setPeriod] = useState(thisMonth);
  const [open, setOpen] = useState<{
    employeeId: string;
    name: string;
    date: string;
    cell: MonthRegisterCell;
  } | null>(null);

  const month = useMonthRegisterQuery(period, undefined, canView);
  const download = useHrDownload();

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see attendance in this shop.</Alert>
      </Stack>
    );
  }

  const data = month.data;
  const rows = data?.rows ?? [];
  const dates = data?.dates ?? [];

  return (
    <Stack gap="md">
      <PageHeader
        description="Everyone's attendance for the month, with totals."
        actions={<HrInbox />}
      />

      <Box className={hrChrome.hrPageToolbar}>
        <MonthPicker value={period} onChange={setPeriod} max={thisMonth} label="Month" />
        <Box className={hrChrome.hrPageToolbarEnd}>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/hr/attendance')}
          >
            Daily register
          </Button>
          {/* R5.12 / R12.1: the register as Excel (VIEW_ATTENDANCE, same as this page). */}
          <Button
            type="button"
            variant="outline"
            loading={download.pending != null}
            onClick={() =>
              void download.run('month-export', async () =>
                deliverHrFile(await attendanceApi.monthExport(period), 'xlsx'),
              )
            }
          >
            Download Excel
          </Button>
        </Box>
      </Box>
      <HrDownloadAlert download={download} />

      {data?.locked ? (
        <Alert variant="warning">
          Payroll for {formatMonth(period)} is finalised, so this month cannot be changed. Reopen
          payroll to change it.
        </Alert>
      ) : null}
      {month.error ? <Alert variant="danger">{month.error.message}</Alert> : null}

      {month.isLoading ? (
        <CenteredLoader label="Loading register…" />
      ) : rows.length === 0 && !month.error ? (
        <EmptyState
          title={`Nobody was employed in ${formatMonth(period)}`}
          action={
            <Button
              type="button"
              variant="solid"
              onClick={() => navigate('/dashboard/hr/employees')}
            >
              Go to employees
            </Button>
          }
        />
      ) : rows.length > 0 ? (
        <Stack gap="sm">
          <DenseTable className={hrChrome.hrRegisterScroll}>
            <DenseTableSurface aria-label={`Attendance register, ${formatMonth(period)}`}>
              <TableHead>
                <DenseTableRow>
                  <DenseTableHeaderCell scope="col" className={hrChrome.hrRegisterNameCell}>
                    Employee
                  </DenseTableHeaderCell>
                  {dates.map((d) => (
                    <DenseTableHeaderCell
                      key={d}
                      scope="col"
                      abbr={formatDayShort(d)}
                      className={hrChrome.hrRegisterDayCell}
                    >
                      <Box as="span" className={hrChrome.hrRegisterDayHead}>
                        <Text as="span" variant="caption">
                          {Number(d.slice(8, 10))}
                        </Text>
                        <Text as="span" variant="micro" color="muted">
                          {WEEKDAY_LETTER[weekdayOf(d)]}
                        </Text>
                      </Box>
                    </DenseTableHeaderCell>
                  ))}
                  {TOTAL_COLUMNS.map((c) => (
                    <DenseTableHeaderCell
                      key={c.key}
                      scope="col"
                      className={hrChrome.hrRegisterTotalCell}
                    >
                      {c.label}
                    </DenseTableHeaderCell>
                  ))}
                </DenseTableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <DenseTableRow key={row.employeeId}>
                    <DenseTableHeaderCell scope="row" className={hrChrome.hrRegisterNameCell}>
                      <EmployeeNameLink
                        employeeId={row.employeeId}
                        name={row.name}
                        code={row.code}
                      />
                    </DenseTableHeaderCell>
                    {row.cells.map((cell, i) => {
                      const date = dates[i];
                      // Future days and days outside employment have nothing to open. "Future"
                      // is the server's flag (run B6); a future holiday or leave still opens.
                      const future = isBlankFutureCell(cell);
                      return (
                        <DenseTableCell key={date} className={hrChrome.hrRegisterDayCell}>
                          {future || cell.status === 'NOT_EMPLOYED' ? (
                            <AttendanceMark
                              status={cell.status}
                              future={future}
                              context={`${row.name}, ${formatDayShort(date)}`}
                            />
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={hrChrome.hrRegisterDayButton}
                              aria-label={`${spoken(row.name, date, cell)}. Show day detail`}
                              onClick={() =>
                                setOpen({ employeeId: row.employeeId, name: row.name, date, cell })
                              }
                            >
                              <AttendanceMark status={cell.status} late={cell.late ?? false} />
                              <CaptureSourceIcon source={cell.markSource} />
                            </Button>
                          )}
                        </DenseTableCell>
                      );
                    })}
                    {TOTAL_COLUMNS.map((c) => (
                      <DenseTableCell
                        key={c.key}
                        className={hrChrome.hrRegisterTotalCell}
                        data-total={c.key}
                      >
                        {formatCount(row.totals[c.key])}
                      </DenseTableCell>
                    ))}
                  </DenseTableRow>
                ))}
              </TableBody>
            </DenseTableSurface>
          </DenseTable>
          <AttendanceLegend />
        </Stack>
      ) : null}

      <AttendanceDayDrawer day={open} canSeeHistory={canMark} onClose={() => setOpen(null)} />
    </Stack>
  );
}
