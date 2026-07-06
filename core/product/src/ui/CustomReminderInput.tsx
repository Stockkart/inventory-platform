import type { CustomReminderInput } from '@inventory-platform/contracts';
import {
  Box,
  Button,
  FormField,
  IconButton,
  Inline,
  Input,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
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

  const reminderAtId = `custom-reminder-at-${index}`;
  const endDateId = `custom-reminder-end-${index}`;
  const notesId = `custom-reminder-notes-${index}`;

  return (
    <Box className={styles.reminderItem}>
      <Inline justify="between" align="center" className={styles.reminderHeader}>
        <Text variant="heading4" weight="semibold" className={styles.reminderTitle}>
          Custom Reminder {index + 1}
        </Text>
        <IconButton
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(index)}
          disabled={disabled}
          label={`Remove custom reminder ${index + 1}`}
        >
          ×
        </IconButton>
      </Inline>
      <Stack gap="sm" className={styles.reminderFields}>
        <FormField label="Reminder Date & Time" htmlFor={reminderAtId} required>
          <Input
            id={reminderAtId}
            type="datetime-local"
            value={formatDateForInput(reminder.reminderAt)}
            onChange={(e) => handleDateChange('reminderAt', e.target.value)}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label="End Date & Time" htmlFor={endDateId} required>
          <Input
            id={endDateId}
            type="datetime-local"
            value={formatDateForInput(reminder.endDate)}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label="Notes (Optional)" htmlFor={notesId}>
          <Textarea
            id={notesId}
            rows={2}
            placeholder="Add notes..."
            value={reminder.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </Stack>
    </Box>
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
    <Box className={styles.section}>
      <Inline justify="between" align="center" className={styles.sectionHeader}>
        <Text variant="heading3" weight="semibold" className={styles.sectionTitle}>
          Custom Reminders
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.addButton}
          onClick={addReminder}
          disabled={disabled}
        >
          + Add Reminder
        </Button>
      </Inline>
      {reminders.length === 0 ? (
        <Text color="secondary" className={styles.emptyMessage}>
          No custom reminders added. Click &quot;Add Reminder&quot; to create one.
        </Text>
      ) : (
        <Stack gap="sm" className={styles.remindersList}>
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
        </Stack>
      )}
    </Box>
  );
}
