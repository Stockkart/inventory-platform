import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  MonthPicker,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  hrChrome,
  LinkButton,
} from '@inventory-platform/ui-kit';
import {
  finaliseOrderBlocker,
  formatInr,
  cycleRange,
  formatDateRange,
  formatMonth,
  formatSalaryPeriod,
  salaryPeriodOf,
  salaryRange,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { HrInbox } from '../ui/HrInbox';
import {
  useCreatePayrollRunMutation,
  useHrSettingsQuery,
  usePayrollRunsQuery,
} from '../queries/hooks';
import { PayrollStatusBadge, payrollRunPath } from '../ui/PayrollStatusBadge';

/**
 * Payroll months (R8.1, R8.16): pick a month and start (or open) its payroll; one run per month.
 * Lists every run with status and totals, and says which month has to be finalised first.
 */
export function PayrollListPage() {
  const navigate = useNavigate();
  const { can } = useHrAccess();
  const canRun = can('RUN_PAYROLL');
  const canView = canRun || can('RECORD_PAYMENTS');
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runs = usePayrollRunsQuery(canView);
  const create = useCreatePayrollRunMutation();
  const settings = useHrSettingsQuery(canView);
  // Latest month that can be picked = the salary month today falls in (server value, else
  // worked out from the start day). Until the user picks, that month is selected.
  const currentPeriod =
    settings.data?.currentSalaryPeriod ?? salaryPeriodOf(settings.data?.payCycleStartDay);
  const period = picked ?? currentPeriod;
  const setPeriod = (value: string) => setPicked(value);

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see payroll in this shop.</Alert>
      </Stack>
    );
  }

  // Newest month first on screen; the order rules are checked against all runs.
  const list = [...(runs.data ?? [])].sort((a, b) => b.period.localeCompare(a.period));
  const existing = list.find((r) => r.period === period);
  // A started month keeps the dates it was made with; otherwise use the shop's current start day.
  const range = existing
    ? salaryRange(existing)
    : cycleRange(period, settings.data?.payCycleStartDay ?? 1);

  const start = () => {
    setError(null);
    // The server answers the existing run when the month already has one, so a double click or
    // a stale list never makes a second run.
    create.mutate(period, {
      onSuccess: (run) => navigate(payrollRunPath(run.id)),
      onError: (err) => setError(err.message || 'Could not start payroll'),
    });
  };

  return (
    <Stack gap="md">
      <PageHeader
        description="Work out pay from attendance, check it, then finalise each month."
        actions={<HrInbox />}
      />
      <Box className={hrChrome.hrPageToolbar}>
        <Stack gap="xs">
          <MonthPicker label="Month" value={period} onChange={setPeriod} max={currentPeriod} />
          <Text variant="caption" color="secondary">
            Salary period {formatDateRange(range.from, range.to)}
          </Text>
        </Stack>
        <Box className={hrChrome.hrPageToolbarEnd}>
          {existing ? (
            <Button
              type="button"
              variant="solid"
              onClick={() => navigate(payrollRunPath(existing.id))}
            >
              Open payroll for {formatMonth(period)}
            </Button>
          ) : canRun ? (
            <Button type="button" variant="solid" loading={create.isPending} onClick={start}>
              Start payroll for {formatMonth(period)}
            </Button>
          ) : null}
        </Box>
      </Box>
      <Text variant="caption" color="secondary">
        Months are finalised oldest first. To change a finalised month, reopen it; months are
        reopened newest first.
      </Text>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {runs.error ? <Alert variant="danger">{runs.error.message}</Alert> : null}

      <Card>
        <CardBody>
          <Table aria-label="Payroll months">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Month</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Employees</TableHeaderCell>
                <TableHeaderCell>Gross pay</TableHeaderCell>
                <TableHeaderCell>Net pay</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.isLoading ? (
                <TableLoadingRow colSpan={5} />
              ) : list.length === 0 ? (
                <TableEmptyRow colSpan={5} message="No payroll yet. Pick a month and start it." />
              ) : (
                list.map((r) => {
                  const hint = r.status === 'DRAFT' ? finaliseOrderBlocker(r, list) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <LinkButton
                          aria-label={`Open payroll for ${formatMonth(r.period)}`}
                          onClick={() => navigate(payrollRunPath(r.id))}
                        >
                          {formatSalaryPeriod(r)}
                        </LinkButton>
                      </TableCell>
                      <TableCell>
                        <PayrollStatusBadge status={r.status} />
                        {hint ? (
                          <Text variant="caption" color="muted">
                            {hint}
                          </Text>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.totals?.employeeCount ?? '—'}</TableCell>
                      <TableCell>{formatInr(r.totals?.gross)}</TableCell>
                      <TableCell>{formatInr(r.totals?.net)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}
