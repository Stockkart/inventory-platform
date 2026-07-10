import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { AlertVariant } from '../utils/types';
import styles from './feedback.module.css';

const alertClass: Record<AlertVariant, string> = {
  info: styles.alertInfo,
  success: styles.alertSuccess,
  warning: styles.alertWarning,
  danger: styles.alertDanger,
};

export interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}

export function Alert({ variant = 'info', children, className, role = 'alert' }: AlertProps) {
  return (
    <div className={cn(styles.alert, alertClass[variant], className)} role={role}>
      {children}
    </div>
  );
}

export interface ToastProps {
  message: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning';
  onClose?: () => void;
  className?: string;
}

export function Toast({ message, variant = 'default', onClose, className }: ToastProps) {
  return (
    <div
      className={cn(
        styles.toast,
        variant === 'success' && styles.toastSuccess,
        variant === 'error' && styles.toastError,
        variant === 'warning' && styles.toastWarning,
        className,
      )}
      role="status"
    >
      <div>{message}</div>
      {onClose ? (
        <button type="button" aria-label="Dismiss" onClick={onClose}>
          ×
        </button>
      ) : null}
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, max = 100, className, label }: ProgressBarProps) {
  return (
    <progress
      className={cn(styles.progress, className)}
      value={value}
      max={max}
      aria-label={label}
    />
  );
}
