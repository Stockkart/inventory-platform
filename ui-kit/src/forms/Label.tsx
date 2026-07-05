import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface LabelProps {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Label({ htmlFor, required, children, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(styles.label, required && styles.labelRequired, className)}
    >
      {children}
    </label>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  const inputId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <label className={cn(styles.checkboxLabel, className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: ReactNode }>;
  className?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  className,
}: RadioGroupProps) {
  return (
    <div className={cn(styles.radioGroup, className)} role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className={styles.radioOption}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Switch({ label, className, id, ...rest }: SwitchProps) {
  const inputId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <label className={cn(styles.switchLabel, className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className={styles.switch} {...rest} />
      <span>{label}</span>
    </label>
  );
}
