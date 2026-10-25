import { useEffect, useState } from 'react';
import {
  EditModal,
  FormField,
  Input,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MAX_ADVANCE_TEXT_LENGTH,
  PAYMENT_METHOD_LABELS,
  advanceFormToRequest,
  formatInr,
  todayIso,
  validateAdvanceForm,
  type AdvanceFormErrors,
  type AdvanceFormValue,
  type HrPaymentMethod,
} from '@inventory-platform/hr/types';
import { useRecordAdvanceMutation } from '../queries/hooks';
import { EmployeePicker, type EmployeePickerOption } from './EmployeePicker';

const PAID_BY_OPTIONS = (['CASH', 'BANK', 'UPI'] as HrPaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

export interface GiveAdvanceModalProps {
  open: boolean;
  onClose: () => void;
  /** Choices for the employee picker (active employees). Ignored when `employee` is set. */
  employees?: readonly EmployeePickerOption[];
  /** Fixed employee (employee detail page): no picker. */
  employee?: EmployeePickerOption;
}

function emptyForm(employeeId: string): AdvanceFormValue {
  return {
    employeeId,
    date: todayIso(),
    amount: '',
    monthlyDeduction: '',
    paidBy: 'CASH',
    note: '',
  };
}

/**
 * "Give advance" (R7.1): employee, date (not after today), amount, monthly deduction (not more
 * than the amount), paid by and a note. Recording also makes the accounts entry.
 */
export function GiveAdvanceModal({
  open,
  onClose,
  employees = [],
  employee,
}: GiveAdvanceModalProps) {
  const today = todayIso();
  const record = useRecordAdvanceMutation();
  const [form, setForm] = useState<AdvanceFormValue>(() => emptyForm(employee?.employeeId ?? ''));
  const [errors, setErrors] = useState<AdvanceFormErrors>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(employee?.employeeId ?? ''));
      setErrors({});
      setError(null);
    }
  }, [open, employee?.employeeId]);

  const set = <K extends keyof AdvanceFormValue>(key: K, value: AdvanceFormValue[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const found = validateAdvanceForm(form, today);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    record.mutate(advanceFormToRequest(form), {
      onSuccess: (saved) => {
        useNotify.success(
          `Advance of ${formatInr(saved.amount)} recorded for ${
            saved.employeeName ?? 'the employee'
          }`,
        );
        onClose();
      },
      // e.g. "The employee was not employed on this date", already in plain words.
      onError: (err) => setError(err.message || 'Could not record the advance'),
    });
  };

  return (
    <EditModal
      open={open}
      title="Give advance"
      onClose={onClose}
      onCancel={onClose}
      onSave={handleSave}
      saving={record.isPending}
      error={error}
      saveLabel="Record advance"
    >
      <Stack gap="md">
        {employee ? (
          <Text>
            {employee.name}{' '}
            <Text as="span" color="muted">
              {employee.code}
            </Text>
          </Text>
        ) : (
          <Stack gap="xs">
            <EmployeePicker
              value={form.employeeId}
              employees={employees}
              onChange={(id) => set('employeeId', id)}
              disabled={record.isPending}
            />
            {errors.employeeId ? (
              <Text variant="caption" color="danger">
                {errors.employeeId}
              </Text>
            ) : null}
          </Stack>
        )}
        <FormField label="Date given" id="hr-advance-date" error={errors.date}>
          <Input
            id="hr-advance-date"
            type="date"
            value={form.date}
            max={today}
            onChange={(e) => set('date', e.target.value)}
            disabled={record.isPending}
          />
        </FormField>
        <FormField label="Amount (₹)" id="hr-advance-amount" error={errors.amount}>
          <Input
            id="hr-advance-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            disabled={record.isPending}
          />
        </FormField>
        <FormField
          label="Take from pay each month (₹)"
          id="hr-advance-monthly"
          hint="Taken from salary every month until the advance is repaid. Not more than the amount."
          error={errors.monthlyDeduction}
        >
          <Input
            id="hr-advance-monthly"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.monthlyDeduction}
            onChange={(e) => set('monthlyDeduction', e.target.value)}
            disabled={record.isPending}
          />
        </FormField>
        <Stack gap="xs">
          <Text variant="label" as="span">
            Paid by
          </Text>
          <SegmentedControl<HrPaymentMethod>
            aria-label="Paid by"
            options={PAID_BY_OPTIONS}
            value={form.paidBy}
            onChange={(v) => set('paidBy', v)}
            disabled={record.isPending}
          />
        </Stack>
        <FormField label="Note (optional)" id="hr-advance-note" error={errors.note}>
          <Textarea
            id="hr-advance-note"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            maxLength={MAX_ADVANCE_TEXT_LENGTH}
            rows={2}
            disabled={record.isPending}
          />
        </FormField>
      </Stack>
    </EditModal>
  );
}
