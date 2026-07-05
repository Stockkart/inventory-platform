import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { ButtonVariant, UiSize } from '../utils/types';
import { Spinner } from '../feedback/Spinner';
import styles from './forms.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: UiSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = 'solid',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        fullWidth && styles.fullWidth,
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
