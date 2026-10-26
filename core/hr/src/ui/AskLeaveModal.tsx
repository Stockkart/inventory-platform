import { useEffect, useState } from 'react';
import {
  Alert,
  ChoiceList,
  EditModal,
  FilterDropdown,
  FormField,
  Inline,
  Input,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_LEAVE_TEXT_LENGTH,
  formatDays,
  type LeaveBalance,
  type MyLeavePreviewParams,
} from '@inventory-platform/hr/types';
import { useMyLeavePreviewQuery, useRequestLeaveMutation } from '../queries/hooks';

export interface AskLeaveModalProps {
  open: boolean;
  onClose: () => void;
  /** The caller's own balances: the leave types they can ask for. */
  balances: readonly LeaveBalance[];
  defaultDate: string;
}

function balanceHint(b: LeaveBalance): string {
  if (!b.paid) return 'Unpaid';
  return b.available == null ? 'Paid · no limit' : `Paid · ${formatDays(b.available)} left`;
}

/**
 * "Ask for leave" in My HR (R1.5, R6.5): own request only, PENDING until an approver decides.
 * A preview shows the working days it covers and the balance left; a paid type over the balance
 * is stopped here with a hint to pick an unpaid type (the server refuses it too, R6.13).
 */
export function AskLeaveModal({ open, onClose, balances, defaultDate }: AskLeaveModalProps) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const request = useRequestLeaveMutation();

  // Start clean every time the modal opens (it stays mounted between uses).
  useEffect(() => {
    if (!open) return;
    setLeaveTypeId('');
    setFrom(defaultDate);
    setTo(defaultDate);
    setHalfDay(false);
    setReason('');
    setError(null);
  }, [open, defaultDate]);

  const singleDay = from === to;
  const datesValid = Boolean(from) && Boolean(to) && from <= to;
  const previewParams: MyLeavePreviewParams | null =
    open && leaveTypeId && datesValid
      ? { leaveTypeId, from, to, halfDay: singleDay && halfDay }
      : null;
  const preview = useMyLeavePreviewQuery(previewParams);
  const overBalance = preview.data?.paid === true && preview.data.exceedsBalance;
  const chosen = balances.find((b) => b.leaveTypeId === leaveTypeId);

  const handleSave = () => {
    if (!leaveTypeId) return setError('Choose a leave type.');
    if (!datesValid) return setError('The leave must end on or after its first day.');
    if (reason.length > MAX_LEAVE_TEXT_LENGTH) {
      return setError(`The reason may have at most ${MAX_LEAVE_TEXT_LENGTH} characters.`);
    }
    if (overBalance) {
      return setError('Not enough balance for this leave type. Choose an unpaid leave type.');
    }
    setError(null);
    request.mutate(
      {
        leaveTypeId,
        fromDate: from,
        toDate: to,
        halfDay: singleDay && halfDay ? true : null,
        reason: reason.trim() || null,
      },
      {
        onSuccess: (saved) => {
          useNotify.success(
            `Leave asked for: ${formatDays(saved.days)}. You will see here when it is decided.`,
          );
          onClose();
        },
        // Server messages are plain English (overlap, locked month, balance, too long).
        onError: (err) => setError(err.message || 'Could not send the request'),
      },
    );
  };

  return (
    <EditModal
      open={open}
      title="Ask for leave"
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={request.isPending}
      error={error}
      saveLabel="Send request"
    >
      <Stack gap="md">
        <FilterDropdown
          label="Leave type"
          value={chosen?.leaveTypeName ?? 'Choose'}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          disabled={request.isPending}
          wide
        >
          <ChoiceList
            aria-label="Leave type"
            options={balances.map((b) => ({
              value: b.leaveTypeId,
              label: b.leaveTypeName,
              hint: balanceHint(b),
            }))}
            value={leaveTypeId}
            onChange={(v) => {
              setPickerOpen(false);
              setLeaveTypeId(v);
            }}
          />
        </FilterDropdown>

        <Inline gap="sm" flexWrap align="start">
          <FormField label="From" id="hr-my-leave-from">
            <Input
              id="hr-my-leave-from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                // Keep the range valid while typing the first day.
                if (e.target.value > to) setTo(e.target.value);
              }}
              disabled={request.isPending}
            />
          </FormField>
          <FormField label="To" id="hr-my-leave-to">
            <Input
              id="hr-my-leave-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              disabled={request.isPending}
            />
          </FormField>
        </Inline>

        <Switch
          label="Half day"
          checked={singleDay && halfDay}
          onChange={(e) => setHalfDay(e.target.checked)}
          disabled={!singleDay || request.isPending}
        />

        <FormField label="Reason (optional)" id="hr-my-leave-reason">
          <Textarea
            id="hr-my-leave-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_LEAVE_TEXT_LENGTH}
            rows={2}
            disabled={request.isPending}
          />
        </FormField>

        <Stack gap="xs" aria-live="polite">
          {preview.isFetching && !preview.data ? (
            <Text variant="caption" color="muted">
              Working out the days…
            </Text>
          ) : null}
          {preview.error ? <Alert variant="warning">{preview.error.message}</Alert> : null}
          {preview.data && previewParams ? (
            <Text variant="caption" color="secondary">
              {formatDays(preview.data.days)} of {chosen?.leaveTypeName ?? 'leave'} (working days
              only)
              {preview.data.available == null
                ? '; no limit.'
                : `; ${formatDays(preview.data.available)} left before this.`}
            </Text>
          ) : null}
          {overBalance ? (
            <Alert variant="warning">
              This is more than your balance left. Choose an unpaid leave type for the extra days.
            </Alert>
          ) : null}
        </Stack>
      </Stack>
    </EditModal>
  );
}
