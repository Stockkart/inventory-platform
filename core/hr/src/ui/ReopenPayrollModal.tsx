import { useEffect, useState } from 'react';
import { EditModal, FormField, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_PAYROLL_REASON_LENGTH,
  formatMonth,
  type PayrollRunResponse,
} from '@inventory-platform/hr/types';
import { useReopenPayrollMutation } from '../queries/hooks';

export interface ReopenPayrollModalProps {
  /** null = closed. */
  run: PayrollRunResponse | null;
  onClose: () => void;
}

/** Reopen the latest finalised month with a reason (R8.14); explains what it undoes. */
export function ReopenPayrollModal({ run, onClose }: ReopenPayrollModalProps) {
  const reopen = useReopenPayrollMutation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [run?.id]);

  if (!run) return null;
  const month = formatMonth(run.period);

  const handleSave = () => {
    if (!reason.trim()) {
      setError('Please give a reason for reopening this month');
      return;
    }
    reopen.mutate(
      { runId: run.id, reason },
      {
        onSuccess: () => {
          useNotify.success(`Payroll for ${month} reopened`);
          onClose();
        },
        // Order rule ("Reopen … first") and "Undo the salary payments of this run first".
        onError: (err) => setError(err.message || 'Could not reopen this payroll'),
      },
    );
  };

  return (
    <EditModal
      open
      title={`Reopen payroll for ${month}`}
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={reopen.isPending}
      error={error}
      saveLabel="Reopen payroll"
    >
      <Stack gap="md">
        <Text>
          Reopening unlocks attendance for {month} and reverses its accounts entry. The pay goes
          back to draft so you can change it, then finalise it again.
        </Text>
        <Text variant="caption" color="secondary">
          Months are reopened newest first, so only the latest finalised month can be reopened. A
          month with salary payments cannot be reopened until those payments are undone.
        </Text>
        <FormField label="Reason" id="hr-payroll-reopen-reason">
          <Textarea
            id="hr-payroll-reopen-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_PAYROLL_REASON_LENGTH}
            rows={2}
            disabled={reopen.isPending}
          />
        </FormField>
      </Stack>
    </EditModal>
  );
}
