import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function Textarea({ hasError, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(styles.textarea, hasError && styles.controlError, className)}
      aria-invalid={hasError || undefined}
      {...rest}
    />
  );
}
