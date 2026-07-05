import { useState } from 'react';
import type {
  CreateReminderDto,
  UpdateReminderDto,
  Reminder,
} from '@inventory-platform/types';
import styles from './ReminderForm.module.css';
import { useNotify } from '@inventory-platform/store';

interface ReminderFormProps {
  reminder?: Reminder;
  inventoryId?: string;
  onSubmit: (data: CreateReminderDto | UpdateReminderDto) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

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
    endDate: reminder?.expiryDate
      ? new Date(reminder.expiryDate).toISOString().slice(0, 16)
      : '',
    notes: reminder?.notes || '',
    status: reminder?.status || 'PENDING',
  });

  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.reminderAt) {
      notifyError('Reminder date and time is required');
      return;
    }

    try {
      const reminderAtISO = new Date(formData.reminderAt).toISOString();
      const endDateISO = formData.endDate
        ? new Date(formData.endDate).toISOString()
        : undefined;

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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save reminder';
      notifyError(errorMessage);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.formGroup}>
        <label htmlFor="reminderAt" className={styles.label}>
          Reminder Date & Time *
        </label>
        <input
          id="reminderAt"
          name="reminderAt"
          type="datetime-local"
          className={styles.input}
          value={formData.reminderAt}
          onChange={handleChange}
          disabled={isLoading}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="endDate" className={styles.label}>
          End Date & Time (Optional)
        </label>
        <input
          id="endDate"
          name="endDate"
          type="datetime-local"
          className={styles.input}
          value={formData.endDate}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes" className={styles.label}>
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          className={styles.textarea}
          rows={3}
          placeholder="Add any notes about this reminder..."
          value={formData.notes}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      {isEditMode && (
        <div className={styles.formGroup}>
          <label htmlFor="status" className={styles.label}>
            Status
          </label>
          <select
            id="status"
            name="status"
            className={styles.select}
            value={formData.status}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      )}

      <div className={styles.formActions}>
        {onCancel && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || !formData.reminderAt}
        >
          {isLoading
            ? 'Saving...'
            : isEditMode
            ? 'Update Reminder'
            : 'Create Reminder'}
        </button>
      </div>
    </form>
  );
}
