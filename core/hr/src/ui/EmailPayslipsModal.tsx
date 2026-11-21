import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Inline, Modal, Stack, Text } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  formatMonth,
  type EmailPayslipsResponse,
  type PayrollRunResponse,
} from '@inventory-platform/hr/types';
import { useEmailPayslipsMutation } from '../queries/hooks';

export interface EmailPayslipsModalProps {
  /** null = closed. */
  run: PayrollRunResponse | null;
  onClose: () => void;
}

/**
 * "Email payslips" (R10.4, RUN_PAYROLL): pick everyone or some employees. The server queues the
 * emails (sent over the next few minutes, PDF attached) and names who has no email address.
 */
export function EmailPayslipsModal({ run, onClose }: EmailPayslipsModalProps) {
  const send = useEmailPayslipsMutation();
  const lines = run?.lines ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<EmailPayslipsResponse | null>(null);

  // Everyone is ticked each time the box opens.
  useEffect(() => {
    if (!run) return;
    setSelected(new Set((run.lines ?? []).map((l) => l.id)));
    setResult(null);
    // Keyed on the run id only: a background refetch of the same run keeps the user's ticks.
  }, [run?.id]);

  if (!run) return null;
  const month = formatMonth(run.period);
  const allTicked = lines.length > 0 && selected.size === lines.length;

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleSend = () => {
    // Keep the table order so chunks go out in the order shown.
    const lineIds = lines.filter((l) => selected.has(l.id)).map((l) => l.id);
    send.mutate(
      { runId: run.id, lineIds },
      {
        onSuccess: setResult,
        onError: (err) => useNotify.error(err.message || 'Could not send the payslips'),
      },
    );
  };

  return (
    <Modal open onClose={send.isPending ? undefined : onClose} size="md">
      <Modal.Header
        title={`Email payslips for ${month}`}
        onClose={send.isPending ? undefined : onClose}
      />
      <Modal.Body>
        {result ? (
          <Stack gap="sm" aria-live="polite">
            <Text>
              {result.queued === 0
                ? 'No payslip emails were sent.'
                : `${result.queued} ${
                    result.queued === 1 ? 'payslip is' : 'payslips are'
                  } being emailed. They go out over the next few minutes.`}
            </Text>
            {result.skippedNoEmail.length > 0 ? (
              <Alert variant="warning">
                <Stack gap="xs">
                  <Text as="span">
                    No email address, so not sent (add one on the employee page):
                  </Text>
                  <Stack as="ul" gap="xs" aria-label="Employees without an email address">
                    {result.skippedNoEmail.map((s) => (
                      <Text as="li" key={s.lineId}>
                        {s.name} ({s.code})
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              </Alert>
            ) : null}
          </Stack>
        ) : (
          <Stack gap="sm">
            <Text color="secondary">
              Each employee with an email address gets their payslip as a PDF.
            </Text>
            <Checkbox
              id="hr-payslip-email-all"
              label={`Everyone (${lines.length})`}
              checked={allTicked}
              onChange={(e) =>
                setSelected(e.target.checked ? new Set(lines.map((l) => l.id)) : new Set())
              }
              disabled={send.isPending}
            />
            <Stack gap="xs" role="group" aria-label="Employees to email">
              {lines.map((l) => (
                <Checkbox
                  key={l.id}
                  id={`hr-payslip-email-${l.id}`}
                  label={`${l.employeeSnapshot?.name ?? 'Employee'} (${
                    l.employeeSnapshot?.code ?? '—'
                  })`}
                  checked={selected.has(l.id)}
                  onChange={(e) => toggle(l.id, e.target.checked)}
                  disabled={send.isPending}
                />
              ))}
            </Stack>
          </Stack>
        )}
      </Modal.Body>
      <Modal.Footer>
        {result ? (
          <Button type="button" variant="solid" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Inline gap="sm" justify="end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={send.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              loading={send.isPending}
              disabled={selected.size === 0}
              onClick={handleSend}
            >
              Send {selected.size} {selected.size === 1 ? 'payslip' : 'payslips'}
            </Button>
          </Inline>
        )}
      </Modal.Footer>
    </Modal>
  );
}
