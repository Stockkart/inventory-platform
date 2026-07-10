import { useState } from 'react';
import type {
  CreateReminderDto,
  UpdateReminderDto,
  Reminder,
} from '@inventory-platform/reminders/types';
import styles from './ReminderForm.module.css';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Button,
  FormField,
  Inline,
  Input,
  Select,
  Stack,
  Textarea,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';

interface ReminderFormProps {
  reminder?: Reminder;
  inventoryId?: string;
  onSubmit: (data: CreateReminderDto | UpdateReminderDto) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function ReminderForm({
  reminder,
  inventoryId,
  onSubmit,
  onCancel,
  isLoading = false,
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

  const handleSubmit = async () => {
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

  const reminderAtId = 'reminderAt';
  const endDateId = 'endDate';
  const notesId = 'notes';
  const statusId = 'status';

  return (
    <Stack gap="md" className={styles.form}>
      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      <FormField label="Reminder Date & Time" htmlFor={reminderAtId} required>
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

      <FormField label="End Date & Time (Optional)" htmlFor={endDateId}>
        <Input
          id={endDateId}
          name="endDate"
          type="datetime-local"
          value={formData.endDate}
          onChange={(e) => setField('endDate', e.target.value)}
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Notes (Optional)" htmlFor={notesId}>
        <Textarea
          id={notesId}
          name="notes"
          rows={3}
          placeholder="Add any notes about this reminder..."
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

      <Inline gap="sm" className={styles.formActions}>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          variant="solid"
          className={styles.submitButton}
          onClick={() => void handleSubmit()}
          disabled={isLoading || !formData.reminderAt}
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update Reminder' : 'Create Reminder'}
        </Button>
      </Inline>
    </Stack>
  );
}
