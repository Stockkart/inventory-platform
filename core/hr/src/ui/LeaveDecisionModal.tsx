import { useEffect, useState } from 'react';
import { EditModal, FormField, Stack, Text, Textarea } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_LEAVE_TEXT_LENGTH,
  formatDayRange,
  formatDays,
  type LeaveDecision,
  type LeaveRequestResponse,
} from '@inventory-platform/hr/types';
import { useLeaveDecisionMutation } from '../queries/hooks';

const TITLES: Record<LeaveDecision, string> = {
  approve: 'Approve leave',
  reject: 'Reject leave',
  cancel: 'Cancel leave',
};
const DONE: Record<LeaveDecision, string> = {
  approve: 'Leave approved',
  reject: 'Leave rejected',
  cancel: 'Leave cancelled',
};

export interface LeaveDecisionModalProps {
  /** null = closed. */
  target: { request: LeaveRequestResponse; decision: LeaveDecision } | null;
  onClose: () => void;
}

/** Approve, reject or cancel one request with an optional note (R6.7, R6.11). */
export function LeaveDecisionModal({ target, onClose }: LeaveDecisionModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useLeaveDecisionMutation();

  useEffect(() => {
    setNote('');
    setError(null);
  }, [target]);

  if (!target) return null;
  const { request, decision } = target;

  const handleSave = () => {
    decide.mutate(
      { id: request.id, decision, note },
      {
        onSuccess: () => {
          useNotify.success(DONE[decision]);
          onClose();
        },
        // e.g. HR_LEAVE_STATE_CONFLICT ("already decided") or HR_PERIOD_LOCKED, in plain words.
        onError: (err) => setError(err.message || 'Could not update the leave'),
      },
    );
  };

  return (
    <EditModal
      open
      title={TITLES[decision]}
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={decide.isPending}
      error={error}
      saveLabel={TITLES[decision]}
    >
      <Stack gap="md">
        <Text>
          {request.employeeName ?? request.employeeCode ?? 'Employee'} ·{' '}
          {request.leaveTypeName ?? 'Leave'} · {formatDayRange(request.fromDate, request.toDate)}
          {request.halfDay ? ' (half day)' : ''} · {formatDays(request.days)}
        </Text>
        {decision === 'cancel' && request.status === 'APPROVED' ? (
          <Text variant="caption" color="secondary">
            The days go back to the balance and are cleared from attendance.
          </Text>
        ) : null}
        <FormField label="Note (optional)" id="hr-leave-decision-note">
          <Textarea
            id="hr-leave-decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_LEAVE_TEXT_LENGTH}
            rows={2}
            disabled={decide.isPending}
          />
        </FormField>
      </Stack>
    </EditModal>
  );
}
