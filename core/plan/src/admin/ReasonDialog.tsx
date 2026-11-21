import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, FormField, Modal, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import type { ButtonVariant } from '@inventory-platform/ui-kit';

export interface ReasonDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  /** Extra fields shown above the reason, e.g. a shop id. */
  children?: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  /** Blocks confirming, e.g. while a required extra field is empty. */
  confirmDisabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Admin actions always carry a reason; the server rejects blank ones and audits the rest. */
export function ReasonDialog({
  open,
  title,
  message,
  children,
  confirmLabel,
  confirmVariant = 'solid',
  confirmDisabled,
  busy,
  error,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const blank = reason.trim().length === 0;

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="md">
      <Modal.Header title={title} onClose={busy ? undefined : onClose} />
      <Modal.Body>
        <Stack gap="md">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {message ? <Text color="secondary">{message}</Text> : null}
          {children}
          <FormField
            label="Reason"
            htmlFor="admin-action-reason"
            required
            hint="Kept in the audit log."
          >
            <Textarea
              id="admin-action-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </FormField>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={confirmVariant}
          loading={busy}
          disabled={blank || confirmDisabled}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
