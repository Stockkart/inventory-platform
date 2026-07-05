import type { SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export function Select({ hasError, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(styles.control, hasError && styles.controlError, className)}
      aria-invalid={hasError || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}
