import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Icon } from '../icons';
import { Button } from '../forms/Button';
import { IconButton } from '../forms/IconButton';
import { Input } from '../forms/Input';
import { addDays, compareIsoText, localToday, parseIsoDate } from './calendarDate';
import styles from './DateStepper.module.css';

export interface DateStepperProps {
  /** Selected day as 'yyyy-MM-dd'. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day ('yyyy-MM-dd'). */
  min?: string;
  /** Latest selectable day ('yyyy-MM-dd'), e.g. today for attendance. */
  max?: string;
  /** Accessible name of the date box. Defaults to "Date". */
  label?: string;
  /** Overrides "today" (tests, stories, shop time zone). Defaults to the browser's local day. */
  today?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Day chooser for day-by-day screens: Previous day / date box / Next day, plus "Today".
 * Typing or picking in the date box works as usual; empty or invalid text is ignored.
 */
export function DateStepper({
  value,
  onChange,
  min,
  max,
  label = 'Date',
  today,
  id,
  disabled = false,
  className,
}: DateStepperProps) {
  const todayValue = today ?? localToday();
  const inRange = (day: string) =>
    (min === undefined || compareIsoText(day, min) >= 0) &&
    (max === undefined || compareIsoText(day, max) <= 0);

  const previous = addDays(value, -1);
  const next = addDays(value, 1);

  return (
    // No group name here: the date box already carries `label`, and a second element with the
    // same name would be announced twice.
    <div className={cn(styles.root, className)}>
      <IconButton
        label="Previous day"
        size="sm"
        disabled={disabled || !inRange(previous)}
        onClick={() => onChange(previous)}
      >
        <Icon icon={ChevronLeft} size="sm" />
      </IconButton>
      <Input
        id={id}
        type="date"
        className={styles.input}
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const nextValue = e.target.value;
          if (parseIsoDate(nextValue) && inRange(nextValue)) onChange(nextValue);
        }}
      />
      <IconButton
        label="Next day"
        size="sm"
        disabled={disabled || !inRange(next)}
        onClick={() => onChange(next)}
      >
        <Icon icon={ChevronRight} size="sm" />
      </IconButton>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || value === todayValue || !inRange(todayValue)}
        onClick={() => onChange(todayValue)}
      >
        Today
      </Button>
    </div>
  );
}
