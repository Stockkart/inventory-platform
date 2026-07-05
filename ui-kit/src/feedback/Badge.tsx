import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { BadgeVariant } from '../utils/types';
import styles from './feedback.module.css';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], className)}>{children}</span>
  );
}

export interface TagProps {
  children: ReactNode;
  variant?: BadgeVariant;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

export function Tag({
  children,
  variant = 'neutral',
  onRemove,
  removeLabel = 'Remove',
  className,
}: TagProps) {
  return (
    <span className={cn(styles.tag, styles[variant], className)}>
      {children}
      {onRemove ? (
        <button
          type="button"
          className={styles.tagButton}
          aria-label={removeLabel}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
