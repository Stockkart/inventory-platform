import type { CustomReminderInput } from '@inventory-platform/contracts';
import {
  Box,
  Button,
  FormField,
  Icon,
  IconButton,
  Inline,
  Input,
  Stack,
  Text,
  Textarea,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { BellPlus, Plus, Trash2 } from 'lucide-react';

interface CustomReminderInputProps {
  reminder: CustomReminderInput;
  index: number;
  onChange: (index: number, reminder: CustomReminderInput) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

function isoToLocalDateTime(iso: string) {
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function localDateTimeToIso(local: string) {
  return new Date(local).toISOString();
}

function formatDateForInput(isoString: string) {
  if (!isoString) return '';
  try {
    return isoToLocalDateTime(isoString);
  } catch {
    return '';
  }
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

  const handleDateChange = (field: 'reminderAt' | 'endDate', value: string) => {
    if (value) {
      handleChange(field, localDateTimeToIso(value));
    } else {
      handleChange(field, '');
    }
  };

  const reminderAtId = `custom-reminder-at-${index}`;
  const endDateId = `custom-reminder-end-${index}`;
  const notesId = `custom-reminder-notes-${index}`;

  return (
    <Box className={surfaceChrome.reminderRow}>
      <Inline justify="between" align="center" gap="sm" className={surfaceChrome.reminderRowHeader}>
        <Text variant="caption" weight="semibold" color="secondary">
          Reminder {index + 1}
        </Text>
        <IconButton
          type="button"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={disabled}
          label={`Remove reminder ${index + 1}`}
        >
          <Icon icon={Trash2} size="sm" />
        </IconButton>
      </Inline>

      <Box className={surfaceChrome.reminderDateGrid}>
        <FormField label="Starts" htmlFor={reminderAtId} required>
          <Input
            id={reminderAtId}
            type="datetime-local"
            value={formatDateForInput(reminder.reminderAt)}
            onChange={(e) => handleDateChange('reminderAt', e.target.value)}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label="Ends" htmlFor={endDateId} required>
          <Input
            id={endDateId}
            type="datetime-local"
            value={formatDateForInput(reminder.endDate)}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            disabled={disabled}
            required
          />
        </FormField>
      </Box>

      <FormField label="Notes" htmlFor={notesId}>
        <Textarea
          id={notesId}
          rows={1}
          placeholder="Optional notes…"
          value={reminder.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          disabled={disabled}
          className={surfaceChrome.reminderNotes}
        />
      </FormField>
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
    onChange(reminders.filter((_, i) => i !== index));
  };

  return (
    <Box className={surfaceChrome.reminderSection}>
      <Inline
        justify="between"
        align="center"
        gap="sm"
        className={surfaceChrome.reminderSectionHeader}
      >
        <Stack gap="none">
          <Text variant="heading4" weight="semibold">
            Custom reminders
          </Text>
          <Text variant="caption" color="secondary">
            Optional alerts for this product
          </Text>
        </Stack>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon icon={Plus} size="sm" />}
          onClick={addReminder}
          disabled={disabled}
        >
          Add
        </Button>
      </Inline>

      {reminders.length === 0 ? (
        <Box className={surfaceChrome.reminderEmpty}>
          <Box className={surfaceChrome.reminderEmptyIcon} aria-hidden>
            <Icon icon={BellPlus} size="md" />
          </Box>
          <Text variant="caption" color="secondary" align="center">
            No reminders yet. Add one if you want a follow-up alert.
          </Text>
        </Box>
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
