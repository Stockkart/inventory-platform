import { useState, type FormEvent } from 'react';
import type {
  CreateReminderDto,
  UpdateReminderDto,
  Reminder,
} from '@inventory-platform/reminders/types';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  FormField,
  Input,
  Select,
  Stack,
  Textarea,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';

interface ReminderFormProps {
  reminder?: Reminder;
  inventoryId?: string;
  formId?: string;
  onSubmit: (data: CreateReminderDto | UpdateReminderDto) => Promise<void>;
  isLoading?: boolean;
  /** When false, parent should render submit controls (e.g. Modal.Footer). */
  showActions?: boolean;
  onCancel?: () => void;
}

const STATUS_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function ReminderForm({
  reminder,
  inventoryId,
  formId = 'reminder-form',
  onSubmit,
  isLoading = false,
  showActions = true,
  onCancel,
}: ReminderFormProps) {
  const isEditMode = !!reminder;

  const [formData, setFormData] = useState({
    reminderAt: reminder?.reminderAt
      ? new Date(reminder.reminderAt).toISOString().slice(0, 16)
      : '',
    endDate: reminder?.expiryDate ? new Date(reminder.expiryDate).toISOString().slice(0, 16) : '',
    notes: reminder?.notes || '',
    status: reminder?.status || 'PENDING',
  });

  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const setField = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);

    if (!formData.reminderAt) {
      notifyError('Reminder date and time is required');
      return;
    }

    try {
      const reminderAtISO = new Date(formData.reminderAt).toISOString();
      const endDateISO = formData.endDate ? new Date(formData.endDate).toISOString() : undefined;

      if (isEditMode && reminder) {
        const updateData: UpdateReminderDto = {
          reminderAt: reminderAtISO,
          endDate: endDateISO,
          notes: formData.notes || undefined,
          status: formData.status as 'PENDING' | 'COMPLETED',
        };
        await onSubmit(updateData);
      } else {
        const createData: CreateReminderDto = {
          inventoryId: inventoryId,
          reminderAt: reminderAtISO,
          endDate: endDateISO,
          notes: formData.notes || undefined,
          type: 'CUSTOM',
        };
        await onSubmit(createData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save reminder';
      notifyError(errorMessage);
    }
  };

  const reminderAtId = `${formId}-reminderAt`;
  const endDateId = `${formId}-endDate`;
  const notesId = `${formId}-notes`;
  const statusId = `${formId}-status`;

  return (
    <Box as="form" id={formId} onSubmit={(e: FormEvent) => void handleSubmit(e)}>
      <Stack gap="md">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <FormField label="Reminder date & time" htmlFor={reminderAtId} required>
          <Input
            id={reminderAtId}
            name="reminderAt"
            type="datetime-local"
            value={formData.reminderAt}
            onChange={(e) => setField('reminderAt', e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>

        <FormField label="End date & time" htmlFor={endDateId} hint="Optional">
          <Input
            id={endDateId}
            name="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setField('endDate', e.target.value)}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Notes" htmlFor={notesId} hint="Optional">
          <Textarea
            id={notesId}
            name="notes"
            rows={3}
            placeholder="Add any notes about this reminder…"
            value={formData.notes}
            onChange={(e) => setField('notes', e.target.value)}
            disabled={isLoading}
          />
        </FormField>

        {isEditMode ? (
          <FormField label="Status" htmlFor={statusId}>
            <Select
              id={statusId}
              name="status"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(e) => setField('status', e.target.value)}
              disabled={isLoading}
            />
          </FormField>
        ) : null}

        {showActions ? (
          <Stack gap="sm">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" variant="solid" disabled={isLoading || !formData.reminderAt}>
              {isLoading ? 'Saving…' : isEditMode ? 'Update reminder' : 'Create reminder'}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
