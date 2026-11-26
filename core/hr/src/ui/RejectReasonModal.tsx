import { useEffect, useId, useState } from 'react';
import { Button, FormField, Modal, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import { REJECT_REASON_MAX, normaliseRejectReason } from '@inventory-platform/hr/types';

export interface RejectReasonModalProps {
  open: boolean;
  /** How many requests the one reason applies to: 1 for a row, the selection size for bulk. */
  count: number;
  /** Named when rejecting one request, for the sentence under the title. */
  requesterName?: string | null;
  saving?: boolean;
  /** Cancel: nothing is rejected. */
  onClose: () => void;
  /** The reason as the server stores it: trimmed, `null` when blank (R4.7, D13). */
  onConfirm: (reason: string | null) => void;
}

/** The text over the limit, or `null`. Exported for tests. */
export function rejectReasonError(reason: string): string | null {
  return reason.trim().length > REJECT_REASON_MAX
    ? `The reason must be at most ${REJECT_REASON_MAX} characters`
    : null;
}

/**
 * The reason prompt shared by a row's Reject and "Reject selected" (R4.6–R4.7): optional, 0–200
 * characters after trimming with a live counter, whitespace-only sent as "no reason". The worker
 * sees the text word for word (R4.12), so the hint says so.
 */
export function RejectReasonModal({
  open,
  count,
  requesterName,
  saving = false,
  onClose,
  onConfirm,
}: RejectReasonModalProps) {
  const textId = useId();
  const [reason, setReason] = useState('');

  // A fresh prompt every time it opens: the last reason must not stick to the next rejection.
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const error = rejectReasonError(reason);
  const used = reason.trim().length;
  const title = count === 1 ? 'Reject request' : `Reject ${count} requests`;
  const who =
    count === 1
      ? `${requesterName || 'This worker'} will see that the request was not accepted.`
      : `${count} workers will see that their request was not accepted.`;

  const handleConfirm = () => {
    if (error != null) return;
    onConfirm(normaliseRejectReason(reason));
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} size="md">
      <Modal.Header title={title} onClose={saving ? undefined : onClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text>{who}</Text>
          <FormField
            label="Reason (optional)"
            htmlFor={textId}
            hint={`Shown to the worker word for word · ${used} / ${REJECT_REASON_MAX}`}
            error={error ?? undefined}
          >
            <Textarea
              id={textId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={saving}
              hasError={error != null}
              // Not maxLength: the user should see the over-limit message, not a silent cut.
              placeholder="e.g. Wrong shop, or Ask Ramesh to add you"
            />
          </FormField>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          loading={saving}
          disabled={error != null || saving}
        >
          {count === 1 ? 'Reject' : `Reject ${count}`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
