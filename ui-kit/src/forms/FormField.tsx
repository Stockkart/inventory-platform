import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Input } from './Input';
import { Label } from './Label';
import { Textarea } from './Textarea';
import styles from './forms.module.css';

/** Legacy controlled field API (backward compatible). */
export interface LegacyFormFieldProps {
  label: string;
  id?: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'number';
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
}

/** Slot-based field wrapper API. */
export interface FormFieldWrapperProps {
  label: string;
  id?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export type FormFieldProps = LegacyFormFieldProps | FormFieldWrapperProps;

function isWrapperProps(props: FormFieldProps): props is FormFieldWrapperProps {
  return 'children' in props;
}

export function FormField(props: FormFieldProps) {
  if (isWrapperProps(props)) {
    const fieldId = props.htmlFor ?? props.id ?? props.label.toLowerCase().replace(/\s+/g, '-');
    const hintId = props.hint ? `${fieldId}-hint` : undefined;
    const errorId = props.error ? `${fieldId}-error` : undefined;

    return (
      <div className={cn(styles.formGroup, props.className)}>
        <Label htmlFor={fieldId} required={props.required}>
          {props.label}
        </Label>
        {props.children}
        {props.hint ? (
          <span id={hintId} className={styles.hint}>
            {props.hint}
          </span>
        ) : null}
        {props.error ? (
          <span id={errorId} className={styles.error} role="alert">
            {props.error}
          </span>
        ) : null}
      </div>
    );
  }

  const fieldId = props.id ?? props.label.toLowerCase().replace(/\s+/g, '-');
  const hintId = props.hint ? `${fieldId}-hint` : undefined;
  const errorId = props.error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.formGroup}>
      <Label htmlFor={fieldId} required={props.required}>
        {props.label}
      </Label>
      {props.multiline ? (
        <Textarea
          id={fieldId}
          rows={props.rows ?? 3}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={props.placeholder}
          disabled={props.disabled}
          readOnly={props.readOnly}
          hasError={Boolean(props.error)}
          aria-describedby={describedBy}
        />
      ) : (
        <Input
          id={fieldId}
          type={props.type ?? 'text'}
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={props.placeholder}
          disabled={props.disabled}
          readOnly={props.readOnly}
          readOnlyStyle={props.readOnly}
          hasError={Boolean(props.error)}
          aria-describedby={describedBy}
        />
      )}
      {props.hint ? (
        <span id={hintId} className={styles.hint}>
          {props.hint}
        </span>
      ) : null}
      {props.error ? (
        <span id={errorId} className={styles.error} role="alert">
          {props.error}
        </span>
      ) : null}
    </div>
  );
}
