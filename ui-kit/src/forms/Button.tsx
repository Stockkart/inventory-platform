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
  /** Content alignment — use `start` for menu / sidebar rows. */
  align?: 'start' | 'center';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = 'solid',
  size = 'md',
  loading = false,
  fullWidth = false,
  align = 'center',
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
        align === 'start' && styles.alignStart,
        className,
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
