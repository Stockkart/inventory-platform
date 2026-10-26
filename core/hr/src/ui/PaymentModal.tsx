import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  Inline,
  Input,
  Modal,
  ProgressBar,
  SegmentedControl,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_PAYMENT_REFERENCE_LENGTH,
  PAYMENT_METHOD_LABELS,
  describePaymentSummary,
  formatInr,
  formatMonth,
  isLinePending,
  payEveryoneInChunks,
  payLinesInChunks,
  paymentDateBounds,
  pendingTotal,
  todayIso,
  validatePaymentDetails,
  type HrPaymentMethod,
  type PaymentDetails,
  type PaymentSummary,
  type PayrollLineResponse,
  type PayrollRunResponse,
  type RecordSalaryPaymentsRequest,
} from '@inventory-platform/hr/types';
import { useRecordSalaryPaymentsMutation, useRefreshPayroll } from '../queries/hooks';

const METHOD_OPTIONS = (['CASH', 'BANK', 'UPI'] as HrPaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

/** "Pay everyone" or "Mark paid" for one employee. */
export type PaymentTarget = { kind: 'all' } | { kind: 'line'; line: PayrollLineResponse };

export interface PaymentModalProps {
  run: PayrollRunResponse;
  /** null = closed. */
  target: PaymentTarget | null;
  onClose: () => void;
}

/** Today, but never before the run's month (a payment cannot predate the month it pays). */
function defaultDate(period: string, today: string): string {
  const { min } = paymentDateBounds(period, today);
  return today < min ? min : today;
}

/**
 * Records salary payments (R9.1–R9.3): date (from the month's first day up to today), how it was
 * paid and an optional reference. "Pay everyone" sends the server's 50-at-a-time `all` calls one
 * after another with a progress bar, then says who was already paid or is being paid by someone
 * else. Each call is one accounts entry however many employees it covers.
 */
export function PaymentModal({ run, target, onClose }: PaymentModalProps) {
  const today = todayIso();
  const bounds = paymentDateBounds(run.period, today);
  const pay = useRecordSalaryPaymentsMutation();
  const refresh = useRefreshPayroll();
  const lines = run.lines ?? [];

  const [details, setDetails] = useState<PaymentDetails>({
    date: defaultDate(run.period, today),
    method: 'CASH',
    reference: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [paidSoFar, setPaidSoFar] = useState(0);
  const [expected, setExpected] = useState(0);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  // Start clean each time the modal opens for a new target.
  const targetKey = target ? (target.kind === 'all' ? 'all' : target.line.id) : null;
  useEffect(() => {
    if (!targetKey) return;
    setDetails({ date: defaultDate(run.period, todayIso()), method: 'CASH', reference: '' });
    setFormError(null);
    setRunning(false);
    setPaidSoFar(0);
    setSummary(null);
  }, [targetKey, run.period]);

  if (!target) return null;

  const month = formatMonth(run.period);
  const pending = lines.filter(isLinePending);
  const nameOf = (lineId: string) =>
    lines.find((l) => l.id === lineId)?.employeeSnapshot?.name ?? 'an employee';
  const title =
    target.kind === 'all'
      ? `Pay everyone for ${month}`
      : `Mark ${target.line.employeeSnapshot?.name ?? 'employee'} as paid`;

  const start = async () => {
    const problem = validatePaymentDetails(details, run.period, today);
    setFormError(problem);
    if (problem) return;
    setRunning(true);
    setPaidSoFar(0);
    setSummary(null);
    const call = (body: RecordSalaryPaymentsRequest) => pay.mutateAsync({ runId: run.id, body });
    let result: PaymentSummary;
    if (target.kind === 'all') {
      setExpected(pending.length);
      result = await payEveryoneInChunks(call, details, pending.length, setPaidSoFar);
    } else {
      setExpected(1);
      result = await payLinesInChunks(call, details, [target.line.id], setPaidSoFar);
    }
    setRunning(false);
    setSummary(result);
    // Refresh whatever happened: paid lines change status, a failure may leave some paid.
    void refresh();
    if (!result.error && result.paid > 0) {
      useNotify.success(
        result.paid === 1 ? 'Payment recorded' : `${result.paid} payments recorded`,
      );
    }
  };

  const close = () => {
    if (running) return; // the loop must not be left half-way by closing the box
    onClose();
  };

  return (
    <Modal open onClose={close} size="md">
      <Modal.Header title={title} onClose={running ? undefined : onClose} />
      <Modal.Body>
        {summary ? (
          <Stack gap="sm" aria-live="polite">
            {summary.error ? (
              <Alert variant="danger">
                {summary.paid > 0
                  ? `Marked ${summary.paid} as paid, then: ${summary.error.message}`
                  : summary.error.message}
              </Alert>
            ) : null}
            {describePaymentSummary(summary, nameOf).map((sentence) => (
              <Text key={sentence}>{sentence}</Text>
            ))}
          </Stack>
        ) : (
          <Stack gap="md">
            <Text color="secondary">
              {target.kind === 'all'
                ? `${pending.length} ${
                    pending.length === 1 ? 'employee is' : 'employees are'
                  } not paid yet (${pendingTotal(lines)} in all).`
                : `Net pay ${formatInr(target.line.net)}.`}{' '}
              The payment is recorded in the accounts.
            </Text>
            {formError ? <Alert variant="danger">{formError}</Alert> : null}
            <FormField label="Date paid" id="hr-payment-date">
              <Input
                id="hr-payment-date"
                type="date"
                value={details.date}
                min={bounds.min}
                max={bounds.max}
                onChange={(e) => setDetails((d) => ({ ...d, date: e.target.value }))}
                disabled={running}
              />
            </FormField>
            <Stack gap="xs">
              <Text as="span" weight="semibold">
                Paid by
              </Text>
              <SegmentedControl<HrPaymentMethod>
                aria-label="Paid by"
                options={METHOD_OPTIONS}
                value={details.method}
                onChange={(method) => setDetails((d) => ({ ...d, method }))}
                disabled={running}
              />
            </Stack>
            <FormField
              label="Reference (optional)"
              id="hr-payment-reference"
              hint="Cheque number, bank or UPI reference"
            >
              <Input
                id="hr-payment-reference"
                value={details.reference}
                maxLength={MAX_PAYMENT_REFERENCE_LENGTH}
                onChange={(e) => setDetails((d) => ({ ...d, reference: e.target.value }))}
                disabled={running}
              />
            </FormField>

            {running ? (
              <Stack gap="xs" aria-live="polite">
                <ProgressBar
                  value={paidSoFar}
                  max={Math.max(expected, 1)}
                  label="Payments recorded"
                />
                <Text variant="caption" color="secondary">
                  Paid {paidSoFar} of {expected}…
                </Text>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Modal.Body>
      <Modal.Footer>
        {summary ? (
          <Inline gap="sm" justify="end">
            {summary.error ? (
              // Running again only picks up lines that are still pending.
              <Button type="button" variant="outline" onClick={() => void start()}>
                Try again
              </Button>
            ) : null}
            <Button type="button" variant="solid" onClick={onClose}>
              Done
            </Button>
          </Inline>
        ) : (
          <Inline gap="sm" justify="end">
            <Button type="button" variant="ghost" onClick={close} disabled={running}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              loading={running}
              disabled={target.kind === 'all' && pending.length === 0}
              onClick={() => void start()}
            >
              {target.kind === 'all' ? 'Pay everyone' : 'Mark paid'}
            </Button>
          </Inline>
        )}
      </Modal.Footer>
    </Modal>
  );
}
