import { useEffect, useState } from 'react';
import { EditModal, FormField, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_ADVANCE_TEXT_LENGTH,
  formatDate,
  formatInr,
  type AdvanceResponse,
} from '@inventory-platform/hr/types';
import { useCancelAdvanceMutation } from '../queries/hooks';

export interface CancelAdvanceModalProps {
  /** null = closed. */
  advance: AdvanceResponse | null;
  onClose: () => void;
}

/** Cancel an advance nothing was recovered from yet; the reason is required (audited). */
export function CancelAdvanceModal({ advance, onClose }: CancelAdvanceModalProps) {
  const cancel = useCancelAdvanceMutation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setError(null);
  }, [advance]);

  if (!advance) return null;

  const handleSave = () => {
    if (!reason.trim()) {
      setError('Please give a reason for cancelling this advance');
      return;
    }
    cancel.mutate(
      { id: advance.id, reason },
      {
        onSuccess: () => {
          useNotify.success('Advance cancelled');
          onClose();
        },
        // "Part of this advance has already been recovered" or "Payroll is being finalised…".
        onError: (err) => useNotify.error(err.message || 'Could not cancel the advance'),
      },
    );
  };

  return (
    <EditModal
      open
      title="Cancel advance"
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={cancel.isPending}
      error={error}
      saveLabel="Cancel advance"
    >
      <Stack gap="md">
        <Text>
          {advance.employeeName ?? advance.employeeCode ?? 'Employee'} · {formatInr(advance.amount)}{' '}
          given on {formatDate(advance.date)}
        </Text>
        <Text variant="caption" color="secondary">
          The advance will no longer be taken from pay, and its accounts entry is reversed.
        </Text>
        <FormField label="Reason" id="hr-advance-cancel-reason">
          <Textarea
            id="hr-advance-cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_ADVANCE_TEXT_LENGTH}
            rows={2}
            disabled={cancel.isPending}
          />
        </FormField>
      </Stack>
    </EditModal>
  );
}
