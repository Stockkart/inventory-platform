import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export type SelectOptionDef = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  /** When set, renders options inside ui-kit (no raw `<option>` in domain code). */
  options?: readonly SelectOptionDef[];
  children?: ReactNode;
}

export function Select({ hasError, className, children, options, ...rest }: SelectProps) {
  return (
    <select
      className={cn(styles.control, hasError && styles.controlError, className)}
      aria-invalid={hasError || undefined}
      {...rest}
    >
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
}
