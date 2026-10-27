import { useEffect, useState } from 'react';
import {
  Alert,
  EditModal,
  FormField,
  Input,
  Inline,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_LEAVE_TEXT_LENGTH,
  formatDayRange,
  formatDays,
  type LeavePreviewParams,
} from '@inventory-platform/hr/types';
import { useLeavePreviewQuery, useLeaveTypesQuery, useRecordLeaveMutation } from '../queries/hooks';
import { EmployeePicker, type EmployeePickerOption } from './EmployeePicker';
import { LeaveTypePicker } from './LeaveTypePicker';

export interface RecordLeaveModalProps {
  open: boolean;
  onClose: () => void;
  /** Fixed employee (daily register "Leave" button); otherwise a picker over `employees`. */
  employee?: EmployeePickerOption;
  employees?: readonly EmployeePickerOption[];
  /** First and last day; with `fixedDates` the dates are shown, not edited. */
  defaultDate: string;
  fixedDates?: boolean;
  onRecorded?: () => void;
}

/**
 * Records leave for an employee (MARK_ATTENDANCE, R6.6). Recorded leave is approved at once, so
 * this is also how the daily register marks a day as Leave: the server never accepts "Leave" as
 * a mark. A preview shows the working days it covers and what is left of a paid balance; a paid
 * type over the balance is stopped here with a hint to pick an unpaid type (R6.13), the same rule
 * the server enforces with HR_LEAVE_BALANCE_EXCEEDED.
 */
export function RecordLeaveModal({
  open,
  onClose,
  employee,
  employees = [],
  defaultDate,
  fixedDates = false,
  onRecorded,
}: RecordLeaveModalProps) {
  const [employeeId, setEmployeeId] = useState(employee?.employeeId ?? '');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Start clean every time the modal opens (it stays mounted between uses).
  useEffect(() => {
    if (!open) return;
    setEmployeeId(employee?.employeeId ?? '');
    setLeaveTypeId('');
    setFrom(defaultDate);
    setTo(defaultDate);
    setHalfDay(false);
    setReason('');
    setError(null);
  }, [open, employee?.employeeId, defaultDate]);

  const types = useLeaveTypesQuery(open);
  const activeTypes = (types.data ?? []).filter((t) => t.active !== false);
  const record = useRecordLeaveMutation();

  const singleDay = from === to;
  const datesValid = Boolean(from) && Boolean(to) && from <= to;
  const previewParams: LeavePreviewParams | null =
    open && employeeId && leaveTypeId && datesValid
      ? { employeeId, leaveTypeId, from, to, halfDay: singleDay && halfDay }
      : null;
  const preview = useLeavePreviewQuery(previewParams);
  const overBalance = preview.data?.paid === true && preview.data.exceedsBalance;

  const handleSave = () => {
    if (!employeeId) return setError('Choose an employee.');
    if (!leaveTypeId) return setError('Choose a leave type.');
    if (!datesValid) return setError('The leave must end on or after its first day.');
    if (reason.length > MAX_LEAVE_TEXT_LENGTH) {
      return setError(`The reason may have at most ${MAX_LEAVE_TEXT_LENGTH} characters.`);
    }
    if (overBalance) {
      return setError('Not enough balance for this leave type. Choose an unpaid leave type.');
    }
    setError(null);
    record.mutate(
      {
        employeeId,
        leaveTypeId,
        fromDate: from,
        toDate: to,
        halfDay: singleDay && halfDay ? true : null,
        reason: reason.trim() || null,
      },
      {
        onSuccess: (saved) => {
          useNotify.success(
            `Leave recorded for ${saved.employeeName ?? 'the employee'}: ${formatDays(saved.days)}`,
          );
          onRecorded?.();
          onClose();
        },
        // Server messages are plain English (e.g. overlap, locked month, balance).
        onError: (err) => useNotify.error(err.message || 'Could not record the leave'),
      },
    );
  };

  const typeName = activeTypes.find((t) => t.id === leaveTypeId)?.name;

  return (
    <EditModal
      open={open}
      title={employee ? `Record leave for ${employee.name}` : 'Record leave'}
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={record.isPending}
      error={error}
      saveLabel="Record leave"
    >
      <Stack gap="md">
        {employee ? null : (
          <EmployeePicker
            value={employeeId}
            employees={employees}
            onChange={setEmployeeId}
            disabled={record.isPending}
          />
        )}
        <LeaveTypePicker
          value={leaveTypeId}
          types={activeTypes}
          onChange={setLeaveTypeId}
          disabled={record.isPending}
        />
        {types.error ? <Alert variant="danger">{types.error.message}</Alert> : null}

        {fixedDates ? (
          <Text>{formatDayRange(from, to)}</Text>
        ) : (
          <Inline gap="sm" flexWrap align="start">
            <FormField label="From" id="hr-leave-from">
              <Input
                id="hr-leave-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  // Keep the range valid while typing the first day.
                  if (e.target.value > to) setTo(e.target.value);
                }}
                disabled={record.isPending}
              />
            </FormField>
            <FormField label="To" id="hr-leave-to">
              <Input
                id="hr-leave-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                disabled={record.isPending}
              />
            </FormField>
          </Inline>
        )}

        <Switch
          label="Half day"
          checked={singleDay && halfDay}
          onChange={(e) => setHalfDay(e.target.checked)}
          disabled={!singleDay || record.isPending}
        />

        <FormField label="Reason (optional)" id="hr-leave-reason">
          <Textarea
            id="hr-leave-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_LEAVE_TEXT_LENGTH}
            rows={2}
            disabled={record.isPending}
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
              {formatDays(preview.data.days)} of {typeName ?? 'leave'} in {preview.data.leaveYear}
              {preview.data.available == null
                ? ' (no limit).'
                : `; ${formatDays(preview.data.available)} left before this.`}
            </Text>
          ) : null}
          {overBalance ? (
            <Alert variant="warning">
              This is more than the balance left. Choose an unpaid leave type for the extra days.
            </Alert>
          ) : null}
        </Stack>
      </Stack>
    </EditModal>
  );
}
