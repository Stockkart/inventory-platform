import type { CustomReminderInput } from '@inventory-platform/types';
import styles from './CustomReminderInput.module.css';

interface CustomReminderInputProps {
  reminder: CustomReminderInput;
  index: number;
  onChange: (index: number, reminder: CustomReminderInput) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export function CustomReminderInputItem({
  reminder,
  index,
  onChange,
  onRemove,
  disabled = false,
}: CustomReminderInputProps) {
  const handleChange = (field: keyof CustomReminderInput, value: string) => {
    onChange(index, {
      ...reminder,
      [field]: value,
    });
  };

  // Convert ISO (UTC) → datetime-local (local time)
  const isoToLocalDateTime = (iso: string) => {
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Convert datetime-local → ISO (UTC)
  const localDateTimeToIso = (local: string) => {
    return new Date(local).toISOString();
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      return isoToLocalDateTime(isoString);
    } catch {
      return '';
    }
  };

  const handleDateChange = (field: 'reminderAt' | 'endDate', value: string) => {
    if (value) {
      const isoDate = localDateTimeToIso(value);
      handleChange(field, isoDate);
    } else {
      handleChange(field, '');
    }
  };

  return (
    <div className={styles.reminderItem}>
      <div className={styles.reminderHeader}>
        <h4 className={styles.reminderTitle}>Custom Reminder {index + 1}</h4>
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(index)}
          disabled={disabled}
        >
          ×
        </button>
      </div>
      <div className={styles.reminderFields}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Reminder Date & Time *</label>
          <input
            type="datetime-local"
            className={styles.input}
            value={formatDateForInput(reminder.reminderAt)}
            onChange={(e) => handleDateChange('reminderAt', e.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>End Date & Time *</label>
          <input
            type="datetime-local"
            className={styles.input}
            value={formatDateForInput(reminder.endDate)}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Notes (Optional)</label>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Add notes..."
            value={reminder.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

interface CustomRemindersSectionProps {
  reminders: CustomReminderInput[];
  onChange: (reminders: CustomReminderInput[]) => void;
  disabled?: boolean;
}

export function CustomRemindersSection({
  reminders,
  onChange,
  disabled = false,
}: CustomRemindersSectionProps) {
  const addReminder = () => {
    const newReminder: CustomReminderInput = {
      reminderAt: '',
      endDate: '',
      notes: '',
    };
    onChange([...reminders, newReminder]);
  };

  const updateReminder = (index: number, reminder: CustomReminderInput) => {
    const updated = [...reminders];
    updated[index] = reminder;
    onChange(updated);
  };

  const removeReminder = (index: number) => {
    const updated = reminders.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Custom Reminders</h3>
        <button
          type="button"
          className={styles.addButton}
          onClick={addReminder}
          disabled={disabled}
        >
          + Add Reminder
        </button>
      </div>
      {reminders.length === 0 ? (
        <p className={styles.emptyMessage}>
          No custom reminders added. Click "Add Reminder" to create one.
        </p>
      ) : (
        <div className={styles.remindersList}>
          {reminders.map((reminder, index) => (
            <CustomReminderInputItem
              key={index}
              reminder={reminder}
              index={index}
              onChange={updateReminder}
              onRemove={removeReminder}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
