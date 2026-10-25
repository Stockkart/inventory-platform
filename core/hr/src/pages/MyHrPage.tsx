import { useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  ConfirmDialog,
  Inline,
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
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  currentMonth,
  formatDate,
  formatDayRange,
  formatInr,
  formatMonth,
  formatPay,
  todayIso,
  type LeaveRequestResponse,
  type MyPayslipResponse,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { deliverHrFile } from '../api/download';
import { meApi } from '../api/me.api';
import {
  useCancelMyLeaveMutation,
  useHrDownload,
  useMyAttendanceQuery,
  useMyLeaveQuery,
  useMyPayslipsQuery,
  useMyProfileQuery,
} from '../queries/hooks';
import { AskLeaveModal } from '../ui/AskLeaveModal';
import { AttendanceCalendar } from '../ui/AttendanceCalendar';
import { paymentText } from '../ui/EmployeeProfileTab';
import { HrDownloadAlert } from '../ui/HrDownloadAlert';
import { HrInbox } from '../ui/HrInbox';
import { LeaveBalancesTable } from '../ui/LeaveBalancesTable';
import { LeaveRequestsTable } from '../ui/LeaveRequestsTable';

/** Months a request touches (YYYY-MM), first and last. */
function monthsOf(r: LeaveRequestResponse): string[] {
  return [r.fromDate.slice(0, 7), r.toDate.slice(0, 7)];
}

function AttendanceSection() {
  const thisMonth = currentMonth();
  const [period, setPeriod] = useState(thisMonth);
  const month = useMyAttendanceQuery(period);
  // `/me/attendance` is a one-row register: the caller only.
  const row = month.data?.rows[0];

  return (
    <Stack gap="md" as="section" aria-labelledby="hr-me-attendance">
      <Text variant="heading4" as="h3" id="hr-me-attendance">
        My attendance
      </Text>
      <Box className={hrChrome.hrPageToolbar}>
        <MonthPicker value={period} onChange={setPeriod} max={thisMonth} label="Month" />
      </Box>
      {month.error ? <Alert variant="danger">{month.error.message}</Alert> : null}
      {month.isLoading ? (
        <CenteredLoader label="Loading attendance…" />
      ) : row ? (
        <AttendanceCalendar
          period={period}
          row={row}
          dates={month.data?.dates ?? []}
          caption={`My attendance, ${formatMonth(period)}`}
        />
      ) : !month.error ? (
        <Text color="muted">You were not employed in {formatMonth(period)}.</Text>
      ) : null}
    </Stack>
  );
}

function LeaveSection({ lockedMonths }: { lockedMonths: ReadonlySet<string> }) {
  const leave = useMyLeaveQuery(null);
  const cancel = useCancelMyLeaveMutation();
  const [askOpen, setAskOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const balances = leave.data?.balances ?? null;

  const doCancel = () => {
    if (!cancelTarget) return;
    setError(null);
    cancel.mutate(cancelTarget.id, {
      onSuccess: () => {
        useNotify.success('Leave cancelled');
        setCancelTarget(null);
      },
      // e.g. "already decided" or "payroll for that month is finalised", as the server says.
      onError: (err) => {
        setCancelTarget(null);
        setError(err.message || 'Could not cancel the leave');
      },
    });
  };

  return (
    <Stack gap="md" as="section" aria-labelledby="hr-me-leave">
      <Inline gap="sm" justify="between" flexWrap>
        <Text variant="heading4" as="h3" id="hr-me-leave">
          My leave{balances ? ` (${balances.leaveYear})` : ''}
        </Text>
        <Button
          type="button"
          variant="solid"
          onClick={() => setAskOpen(true)}
          disabled={!balances || balances.balances.length === 0}
        >
          Ask for leave
        </Button>
      </Inline>
      {leave.error ? <Alert variant="danger">{leave.error.message}</Alert> : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {!leave.isLoading && !leave.error && !balances ? (
        <Text color="muted">You are not employed in this leave year, so there is no balance.</Text>
      ) : null}
      <LeaveBalancesTable
        rows={balances ? [balances] : []}
        loading={leave.isLoading}
        hideEmployee
      />
      <Text variant="heading4" as="h4">
        My requests
      </Text>
      <LeaveRequestsTable
        requests={leave.data?.requests ?? []}
        loading={leave.isLoading}
        canDecide={false}
        canCancel
        // Own PENDING/APPROVED requests, only while their months' payroll is not finalised.
        isCancellable={(r) => !monthsOf(r).some((m) => lockedMonths.has(m))}
        actionSubject={(r) => `on ${formatDayRange(r.fromDate, r.toDate)}`}
        onAction={(r) => setCancelTarget(r)}
        hideEmployee
      />

      <AskLeaveModal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        balances={balances?.balances ?? []}
        defaultDate={todayIso()}
      />
      <ConfirmDialog
        open={cancelTarget != null}
        title="Cancel this leave?"
        message={
          cancelTarget ? (
            <Text>
              {cancelTarget.leaveTypeName ?? 'Leave'} on{' '}
              {formatDayRange(cancelTarget.fromDate, cancelTarget.toDate)}.
              {cancelTarget.status === 'APPROVED'
                ? ' The days go back to your balance.'
                : ' The request is withdrawn.'}
            </Text>
          ) : (
            ''
          )
        }
        confirmLabel="Cancel leave"
        cancelLabel="Keep it"
        loading={cancel.isPending}
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </Stack>
  );
}

function PayslipsSection({
  payslips,
  loading,
  error,
}: {
  payslips: readonly MyPayslipResponse[];
  loading: boolean;
  error: Error | null;
}) {
  const download = useHrDownload();
  const sorted = [...payslips].sort((a, b) => (a.period < b.period ? 1 : -1));

  return (
    <Stack gap="md" as="section" aria-labelledby="hr-me-payslips">
      <Text variant="heading4" as="h3" id="hr-me-payslips">
        My payslips
      </Text>
      {error ? <Alert variant="danger">{error.message}</Alert> : null}
      <HrDownloadAlert download={download} />
      <Table aria-label="My payslips">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Month</TableHeaderCell>
            <TableHeaderCell>Net pay</TableHeaderCell>
            <TableHeaderCell>Payment</TableHeaderCell>
            <TableHeaderCell>Payslip</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableLoadingRow colSpan={4} />
          ) : sorted.length === 0 ? (
            <TableEmptyRow
              colSpan={4}
              message="No payslips yet. They appear once a month's payroll is finalised."
            />
          ) : (
            sorted.map((p) => (
              <TableRow key={p.lineId}>
                <TableCell>{formatMonth(p.period)}</TableCell>
                <TableCell>{formatInr(p.net)}</TableCell>
                <TableCell>
                  {p.paymentStatus === 'PAID' ? (
                    <Badge variant="success">
                      Paid{p.paidAt ? ` on ${formatDate(p.paidAt)}` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Not paid yet</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={download.pending === p.lineId}
                    aria-label={`Download payslip for ${formatMonth(p.period)}`}
                    onClick={() =>
                      void download.run(p.lineId, async () =>
                        deliverHrFile(await meApi.payslipPdf(p.lineId), 'pdf'),
                      )
                    }
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}

/**
 * My HR (R1.5, R1.6, R6.5, R6.8, R10.5): the signed-in employee's own attendance, leave
 * (balances, requests, ask and cancel) and payslips. Everything comes from `/hr/me/**`, which the
 * server answers for the caller's own employee only; no other employee is ever loaded here.
 */
export function MyHrPage() {
  const { employeeId, accessLoaded } = useHrAccess();
  const linked = employeeId != null;
  const profile = useMyProfileQuery(linked);
  const payslips = useMyPayslipsQuery(linked);
  // A month with a payslip has finalised payroll, so its attendance and leave are locked.
  const lockedMonths = new Set((payslips.data ?? []).map((p) => p.period));

  if (!accessLoaded) return <CenteredLoader label="Loading…" />;
  if (!linked) {
    return (
      <Stack gap="md">
        <Alert variant="info">
          My HR is for staff whose login is linked to an employee. Ask the shop owner to link your
          login on the Employees page.
        </Alert>
      </Stack>
    );
  }

  const me = profile.data;
  return (
    <Stack gap="lg">
      <PageHeader description="Your own attendance, leave and payslips." actions={<HrInbox />} />
      {profile.error ? <Alert variant="danger">{profile.error.message}</Alert> : null}
      {me ? (
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text variant="heading4" as="h2">
                {me.name}
              </Text>
              <Text color="secondary">{[me.code, me.designation].filter(Boolean).join(' · ')}</Text>
              {me.salaryAmount != null ? (
                <Text>Pay: {formatPay(me.payType, me.salaryAmount)}</Text>
              ) : null}
              {me.paymentMethod ? <Text>Paid by {paymentText(me)}</Text> : null}
            </Stack>
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardBody>
          <AttendanceSection />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <LeaveSection lockedMonths={lockedMonths} />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <PayslipsSection
            payslips={payslips.data ?? []}
            loading={payslips.isLoading}
            error={payslips.error}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
