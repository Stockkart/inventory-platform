import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { isApiError } from '@inventory-platform/api-client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  ConfirmDialog,
  Inline,
  Stack,
  StatBlock,
  StatsRow,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  finaliseOrderBlocker,
  formatDateTime,
  formatInr,
  formatMonth,
  formatSalaryPeriod,
  isLinePending,
  isRunBusy,
  reopenOrderBlocker,
  type PayrollLineResponse,
  type SalaryRegisterFormat,
  type UnmarkedDaysResponse,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { deliverHrFile } from '../api/download';
import { payrollApi } from '../api/payroll.api';
import {
  useFetchPayrollUnmarked,
  useFinalisePayrollMutation,
  useHrDownload,
  usePayrollRunQuery,
  usePayrollRunsQuery,
  useRecalculatePayrollMutation,
} from '../queries/hooks';
import { EmailPayslipsModal } from '../ui/EmailPayslipsModal';
import { HrBackLink } from '../ui/HrBackLink';
import { HrInbox } from '../ui/HrInbox';
import { PaymentModal, type PaymentTarget } from '../ui/PaymentModal';
import { PayrollLineDrawer } from '../ui/PayrollLineDrawer';
import { PayrollLinesTable } from '../ui/PayrollLinesTable';
import { PAYROLL_LIST_PATH, PayrollStatusBadge } from '../ui/PayrollStatusBadge';
import { ReopenPayrollModal } from '../ui/ReopenPayrollModal';
import { SalaryRegisterMenu } from '../ui/SalaryRegisterMenu';
import { UndoPaymentModal } from '../ui/UndoPaymentModal';
import { UnmarkedDaysModal } from '../ui/UnmarkedDaysModal';

/** `HR_UNMARKED_DAYS` is the only 422 finalise answers (error bodies carry no code, B3). */
const UNMARKED_STATUS = 422;

/**
 * One payroll month (R8.2–R8.16): totals, a line per employee with the full breakdown in a
 * drawer, changes per line, recalculate, finalise (with the unmarked-days check) and reopen.
 * Users with only RECORD_PAYMENTS see the pay read-only. Run F5, on a finalised run: "Pay
 * everyone" and per-line "Mark paid" / "Undo payment" (RECORD_PAYMENTS), payslips and the salary
 * register (VIEW_SALARIES), and "Email payslips" (RUN_PAYROLL).
 */
export function PayrollRunPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { can } = useHrAccess();
  const canRun = can('RUN_PAYROLL');
  const canView = canRun || can('RECORD_PAYMENTS');
  const canMark = can('MARK_ATTENDANCE');
  const canPayRole = can('RECORD_PAYMENTS');
  const canSeeSalaries = can('VIEW_SALARIES');

  const run = usePayrollRunQuery(canView ? runId : undefined);
  const runs = usePayrollRunsQuery(canView);
  const recalc = useRecalculatePayrollMutation();
  const finalise = useFinalisePayrollMutation();
  const fetchUnmarked = useFetchPayrollUnmarked();

  const [lineId, setLineId] = useState<string | null>(null);
  const [unmarked, setUnmarked] = useState<UnmarkedDaysResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null);
  const [undoLineId, setUndoLineId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const download = useHrDownload();

  const back = <HrBackLink to={PAYROLL_LIST_PATH} label="All payroll months" />;

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see payroll in this shop.</Alert>
      </Stack>
    );
  }
  if (run.isLoading) return <CenteredLoader label="Loading payroll…" />;
  if (run.error || !run.data) {
    return (
      <Stack gap="md">
        {back}
        <Alert variant="danger">{run.error?.message ?? 'Payroll not found'}</Alert>
      </Stack>
    );
  }

  const r = run.data;
  const month = formatMonth(r.period);
  const lines = r.lines ?? [];
  const selected = lineId ? lines.find((l) => l.id === lineId) ?? null : null;
  const allRuns = runs.data ?? [];
  const isDraft = r.status === 'DRAFT';
  const isFinalised = r.status === 'FINALISED';
  const finaliseBlocker = isDraft ? finaliseOrderBlocker(r, allRuns) : null;
  const reopenBlocker = isFinalised ? reopenOrderBlocker(r, allRuns) : null;
  const totals = r.totals;
  // Payments, payslips and the register exist only for a finalised run.
  const canPay = isFinalised && canPayRole;
  const canPayslip = isFinalised && canSeeSalaries;
  const pendingCount = lines.filter(isLinePending).length;
  // R9.6: a run with any payment (or one in flight) cannot be reopened until it is undone.
  const hasPayments = lines.some((l) => (l.paymentStatus ?? 'PENDING') !== 'PENDING');
  const undoLine = undoLineId ? lines.find((l) => l.id === undoLineId) ?? null : null;
  const showToolbar =
    (canRun && (isDraft || isFinalised)) || (isFinalised && (canPayRole || canSeeSalaries));

  const downloadPayslip = (line: PayrollLineResponse) =>
    void download.run(`payslip:${line.id}`, async () =>
      deliverHrFile(await payrollApi.payslipPdf(r.id, line.id), 'pdf'),
    );
  const downloadRegister = (format: SalaryRegisterFormat) =>
    void download.run(`register:${format}`, async () =>
      deliverHrFile(await payrollApi.register(r.id, format), format),
    );
  const payslipPendingId = download.pending?.startsWith('payslip:')
    ? download.pending.slice('payslip:'.length)
    : null;

  /** Shows the unmarked list when there is one, else the confirm dialog. */
  const checkThenConfirm = async () => {
    setChecking(true);
    try {
      const found = await fetchUnmarked(r.id);
      if (found.employees.length > 0) {
        setUnmarked(found);
      } else {
        setUnmarked(null);
        setConfirmOpen(true);
      }
    } catch (err) {
      useNotify.error(
        err instanceof Error && err.message ? err.message : 'Could not check attendance',
      );
    } finally {
      setChecking(false);
    }
  };

  const doFinalise = () => {
    finalise.mutate(r.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        useNotify.success(`Payroll for ${month} finalised`);
      },
      onError: (err) => {
        setConfirmOpen(false);
        if (isApiError(err) && err.status === UNMARKED_STATUS) {
          // Someone cleared a mark between our check and the finalise: show the list again.
          void checkThenConfirm();
          return;
        }
        // 409s are already plain: order rule, someone else finalising, or "Payroll changed
        // while it was being finalised, so it is back to draft…". The run is refetched by the
        // mutation, so the page shows the draft again under this message.
        // Run B6: a month that is not over yet is a 400 ("This month is not over yet. Payroll
        // for YYYY-MM can be finalised from <date>"), not the 422 unmarked flow; shown as sent.
        useNotify.error(err.message || 'Could not finalise this payroll');
      },
    });
  };

  const doRecalc = () => {
    recalc.mutate(r.id, {
      onSuccess: () => useNotify.success('Pay worked out again from the latest attendance'),
      onError: (err) => useNotify.error(err.message || 'Could not recalculate'),
    });
  };

  return (
    <Stack gap="md">
      {back}
      <Inline gap="sm" flexWrap justify="between">
        <Inline gap="sm" flexWrap>
          <Text variant="heading3" as="h2">
            Payroll for {formatSalaryPeriod(r)}
          </Text>
          <PayrollStatusBadge status={r.status} />
        </Inline>
        <HrInbox />
      </Inline>
      <Text variant="caption" color="muted">
        {r.finalisedAt
          ? `Finalised ${formatDateTime(r.finalisedAt)}`
          : r.calculatedAt
          ? `Worked out ${formatDateTime(r.calculatedAt)}`
          : 'Not worked out yet'}
      </Text>

      {!canRun ? (
        <Alert variant="info">
          You can see this payroll. Only people who can run payroll can change, finalise or reopen
          it.
        </Alert>
      ) : null}

      {isRunBusy(r.status) ? (
        <Alert variant="info">
          {r.status === 'FINALISING'
            ? 'This payroll is being finalised right now.'
            : 'This payroll is being reopened right now.'}{' '}
          Refresh in a minute to see the result.{' '}
          <Button type="button" variant="ghost" size="sm" onClick={() => void run.refetch()}>
            Refresh
          </Button>
        </Alert>
      ) : null}

      {showToolbar ? (
        <Box className={hrChrome.hrPageToolbar}>
          {isDraft ? (
            <>
              <Button type="button" variant="outline" loading={recalc.isPending} onClick={doRecalc}>
                Recalculate
              </Button>
              {finaliseBlocker ? (
                <Text color="secondary">{finaliseBlocker}</Text>
              ) : (
                <Button
                  type="button"
                  variant="solid"
                  loading={checking || finalise.isPending}
                  onClick={() => void checkThenConfirm()}
                >
                  Finalise
                </Button>
              )}
            </>
          ) : null}
          {canPay ? (
            pendingCount > 0 ? (
              <Button type="button" variant="solid" onClick={() => setPayTarget({ kind: 'all' })}>
                Pay everyone
              </Button>
            ) : (
              <Text color="secondary">Everyone is paid for {month}.</Text>
            )
          ) : null}
          {canRun && isFinalised ? (
            <Button type="button" variant="outline" onClick={() => setEmailOpen(true)}>
              Email payslips
            </Button>
          ) : null}
          {canPayslip ? (
            <SalaryRegisterMenu
              onDownload={downloadRegister}
              loading={download.pending?.startsWith('register:') ?? false}
            />
          ) : null}
          {canRun && isFinalised ? (
            reopenBlocker ? (
              <Text color="secondary">{reopenBlocker}</Text>
            ) : hasPayments ? (
              <Text color="secondary">
                Undo the salary payments of {month} before reopening it.
              </Text>
            ) : (
              <Button type="button" variant="outline" onClick={() => setReopenOpen(true)}>
                Reopen
              </Button>
            )
          ) : null}
        </Box>
      ) : null}

      <StatsRow>
        <StatBlock label="Employees" value={String(totals?.employeeCount ?? lines.length)} />
        <StatBlock label="Gross pay" value={formatInr(totals?.gross)} />
        <StatBlock label="Deductions" value={formatInr(totals?.deductions)} />
        <StatBlock label="Advance recovered" value={formatInr(totals?.advanceRecovered)} />
        <StatBlock label="Rounding" value={formatInr(totals?.rounding)} />
        <StatBlock label="Net pay" value={formatInr(totals?.net)} />
      </StatsRow>

      <Card>
        <CardBody>
          <PayrollLinesTable
            period={r.period}
            lines={lines}
            showPayment={!isDraft}
            onOpen={(l) => setLineId(l.id)}
            canPay={canPay}
            canPayslip={canPayslip}
            onMarkPaid={(l) => setPayTarget({ kind: 'line', line: l })}
            onUndoPayment={(l) => setUndoLineId(l.id)}
            onPayslip={downloadPayslip}
            payslipPendingId={payslipPendingId}
          />
        </CardBody>
      </Card>

      <PayrollLineDrawer
        runId={r.id}
        line={selected}
        canEdit={canRun && isDraft}
        onClose={() => setLineId(null)}
        canPay={canPay}
        canPayslip={canPayslip}
        onMarkPaid={(l) => setPayTarget({ kind: 'line', line: l })}
        onUndoPayment={(l) => setUndoLineId(l.id)}
        onPayslip={downloadPayslip}
        payslipPending={selected != null && payslipPendingId === selected.id}
      />
      <PaymentModal run={r} target={payTarget} onClose={() => setPayTarget(null)} />
      <UndoPaymentModal runId={r.id} line={undoLine} onClose={() => setUndoLineId(null)} />
      <EmailPayslipsModal run={emailOpen ? r : null} onClose={() => setEmailOpen(false)} />
      <UnmarkedDaysModal
        unmarked={unmarked}
        canMark={canMark}
        onMarked={() => void checkThenConfirm()}
        onOpenAttendance={() => navigate('/dashboard/hr/attendance/month')}
        onClose={() => setUnmarked(null)}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={`Finalise payroll for ${month}?`}
        message={
          <Stack gap="sm">
            <Text>
              Attendance for {month} gets locked, so marks and leave in this month can no longer be
              changed. The salaries are recorded in the accounts.
            </Text>
            <Text variant="caption" color="secondary">
              If something is wrong later, you can reopen this month with a reason.
            </Text>
          </Stack>
        }
        confirmLabel="Finalise payroll"
        loading={finalise.isPending}
        onConfirm={doFinalise}
        onCancel={() => setConfirmOpen(false)}
      />
      <ReopenPayrollModal run={reopenOpen ? r : null} onClose={() => setReopenOpen(false)} />
    </Stack>
  );
}
