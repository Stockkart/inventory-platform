import { useEffect, useId, useState } from 'react';
import {
  Button,
  FormField,
  Modal,
  RadioGroup,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import {
  MANUAL_MARK_REASONS,
  MANUAL_MARK_REASON_LABELS,
  MAX_MARK_REASON_TEXT_LENGTH,
  markReasonFields,
  validateMarkReason,
  type ManualMarkReason,
  type SaveAttendanceDayRow,
} from '@inventory-platform/hr/types';

export interface MarkReasonModalProps {
  open: boolean;
  /** Employees whose day is being marked by hand and who use the Attendance app (R7.2). */
  employeeNames: readonly string[];
  /** Label of the confirming button, e.g. "Save 2 changes"; default "Save". */
  saveLabel?: string;
  saving?: boolean;
  /** Cancel: nothing is saved and the day is left as it was (R7.4). */
  onClose: () => void;
  /** The reason is valid; the caller sends it with the save. */
  onConfirm: (fields: Pick<SaveAttendanceDayRow, 'reason' | 'reasonText'>) => void;
}

/** "Asha", "Asha and Ravi", "Asha, Ravi and 2 others". */
function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? 'this employee';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} and ${rest} other${rest === 1 ? '' : 's'}`;
}

/**
 * Reason prompt for a hand-made mark of an employee who uses the Attendance app (R7.2–R7.4):
 * the quick picks of R7.3, "Other" with 1–200 characters after trimming, Save disabled until the
 * reason is valid. Opened by the registers before they send the save; the server records the
 * reason in HR history (R7.5).
 */
export function MarkReasonModal({
  open,
  employeeNames,
  saveLabel = 'Save',
  saving = false,
  onClose,
  onConfirm,
}: MarkReasonModalProps) {
  const headingId = useId();
  const textId = useId();
  const [reason, setReason] = useState<ManualMarkReason | null>(null);
  const [reasonText, setReasonText] = useState('');

  // A fresh prompt every time it opens: the last reason must not stick to the next save.
  useEffect(() => {
    if (open) {
      setReason(null);
      setReasonText('');
    }
  }, [open]);

  const error = validateMarkReason(reason, reasonText);
  // The hint reads as a rule until the user has typed something that breaks it.
  const textError = reason === 'OTHER' && reasonText.length > 0 ? error : null;

  const handleSave = () => {
    if (error != null || reason == null) return;
    onConfirm(markReasonFields(reason, reasonText));
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} size="md">
      <Modal.Header title="Why mark this by hand?" onClose={saving ? undefined : onClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text id={headingId}>
            {listNames(employeeNames)} {employeeNames.length === 1 ? 'uses' : 'use'} the Attendance
            app, so a reason is kept in HR history with this change.
          </Text>
          <RadioGroup
            name="hr-mark-reason"
            value={reason ?? ''}
            onChange={(v) => setReason(v as ManualMarkReason)}
            options={MANUAL_MARK_REASONS.map((r) => ({
              value: r,
              label: MANUAL_MARK_REASON_LABELS[r],
            }))}
            disabled={saving}
            aria-labelledby={headingId}
          />
          {reason === 'OTHER' ? (
            <FormField
              label="Reason"
              htmlFor={textId}
              required
              hint={`Up to ${MAX_MARK_REASON_TEXT_LENGTH} characters`}
              error={textError ?? undefined}
            >
              <Textarea
                id={textId}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
                disabled={saving}
                hasError={textError != null}
                // Not maxLength: the user should see the over-limit message, not a silent cut.
                aria-describedby={textError ? `${textId}-error` : `${textId}-hint`}
              />
            </FormField>
          ) : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={handleSave}
          loading={saving}
          disabled={error != null || saving}
        >
          {saveLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
