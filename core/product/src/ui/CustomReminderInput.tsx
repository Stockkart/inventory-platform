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
  surfaceChrome,
} from '@inventory-platform/ui-kit';

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

  const isoToLocalDateTime = (iso: string) => {
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

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
    <Box padding="md" border rounded="md" bg="surface">
      <Inline justify="between" align="center" className={surfaceChrome.dividerBlock}>
        <Text variant="heading4" weight="semibold">
          Custom Reminder {index + 1}
        </Text>
        <IconButton
          type="button"
          onClick={() => onRemove(index)}
          disabled={disabled}
          label={`Remove custom reminder ${index + 1}`}
        >
          ×
        </IconButton>
      </Inline>
      <Stack gap="sm">
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
    <Box
      margin="none"
      padding="lg"
      border
      rounded="md"
      bg="elevated"
      className={surfaceChrome.mtLg}
    >
      <Inline justify="between" align="center" mb="md">
        <Text variant="heading3" weight="semibold">
          Custom Reminders
        </Text>
        <Button type="button" variant="outline" size="sm" onClick={addReminder} disabled={disabled}>
          + Add Reminder
        </Button>
      </Inline>
      {reminders.length === 0 ? (
        <Text color="secondary" align="center">
          <Box padding="md">
            No custom reminders added. Click &quot;Add Reminder&quot; to create one.
          </Box>
        </Text>
      ) : (
        <Stack gap="sm">
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
