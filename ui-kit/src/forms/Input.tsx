import type { InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  readOnlyStyle?: boolean;
}

export function Input({
  hasError,
  readOnlyStyle,
  className,
  readOnly,
  ...rest
}: InputProps) {
  return (
    <input
      className={cn(
        styles.control,
        readOnlyStyle || readOnly ? styles.controlReadOnly : undefined,
        hasError && styles.controlError,
        className
      )}
      readOnly={readOnly}
      aria-invalid={hasError || undefined}
      {...rest}
    />
  );
}
