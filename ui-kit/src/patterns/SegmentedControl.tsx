import { cn } from '../utils/cn';
import styles from './SegmentedControl.module.css';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(styles.track, disabled && styles.trackDisabled, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(styles.btn, active && styles.btnActive)}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
