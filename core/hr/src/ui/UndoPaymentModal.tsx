import { useEffect, useState } from 'react';
import { EditModal, FormField, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_PAYROLL_REASON_LENGTH,
  formatInr,
  paymentStatusText,
  type PayrollLineResponse,
} from '@inventory-platform/hr/types';
import { useUndoSalaryPaymentMutation } from '../queries/hooks';

export interface UndoPaymentModalProps {
  runId: string;
  /** null = closed. */
  line: PayrollLineResponse | null;
  onClose: () => void;
}

/**
 * Undo one employee's payment (R9.5), even when it was paid together with others: only this
 * employee's amount is reversed in the accounts. The reason is optional.
 */
export function UndoPaymentModal({ runId, line, onClose }: UndoPaymentModalProps) {
  const undo = useUndoSalaryPaymentMutation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [line?.id]);

  if (!line) return null;
  const name = line.employeeSnapshot?.name ?? 'this employee';

  const handleSave = () => {
    undo.mutate(
      { runId, lineId: line.id, reason },
      {
        onSuccess: () => {
          useNotify.success(`Payment to ${name} undone`);
          onClose();
        },
        // e.g. "This payment is being undone by someone else" — shown as sent.
        onError: (err) => useNotify.error(err.message || 'Could not undo the payment'),
      },
    );
  };

  return (
    <EditModal
      open
      title={`Undo payment to ${name}?`}
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={undo.isPending}
      saveLabel="Undo payment"
    >
      <Stack gap="md">
        <Text>
          {paymentStatusText(line)}, {formatInr(line.net)}. Undoing marks {name} as not paid and
          takes this amount back out of the accounts. Others paid at the same time stay paid.
        </Text>
        <FormField label="Reason (optional)" id="hr-payment-undo-reason">
          <Textarea
            id="hr-payment-undo-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_PAYROLL_REASON_LENGTH}
            rows={2}
            disabled={undo.isPending}
          />
        </FormField>
      </Stack>
    </EditModal>
  );
}
