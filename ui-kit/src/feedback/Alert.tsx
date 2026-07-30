import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { AlertVariant } from '../utils/types';
import { Icon } from '../icons/Icon';
import { IconButton } from '../forms/IconButton';
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

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastProps {
  message: ReactNode;
  variant?: ToastVariant;
  onClose?: () => void;
  className?: string;
}

const toastIcon = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
} as const;

const toastVariantClass: Record<ToastVariant, string | undefined> = {
  default: styles.toastDefault,
  success: styles.toastSuccess,
  error: styles.toastError,
  warning: styles.toastWarning,
};

export function Toast({ message, variant = 'default', onClose, className }: ToastProps) {
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={cn(styles.toast, toastVariantClass[variant], className)}
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <BoxIcon variant={variant} />
      <div className={styles.toastBody}>
        <p className={styles.toastMessage}>{message}</p>
      </div>
      {onClose ? (
        <IconButton
          label="Dismiss"
          size="sm"
          shape="circle"
          className={styles.toastClose}
          onClick={onClose}
        >
          <Icon icon={X} size="sm" />
        </IconButton>
      ) : null}
    </div>
  );
}

function BoxIcon({ variant }: { variant: ToastVariant }) {
  return (
    <span className={styles.toastIcon} aria-hidden>
      <Icon icon={toastIcon[variant]} size="sm" />
    </span>
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
