import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  readOnlyStyle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, readOnlyStyle, className, readOnly, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        styles.control,
        readOnlyStyle || readOnly ? styles.controlReadOnly : undefined,
        hasError && styles.controlError,
        className,
      )}
      readOnly={readOnly}
      aria-invalid={hasError || undefined}
      {...rest}
    />
  );
});
