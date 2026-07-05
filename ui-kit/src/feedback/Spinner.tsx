import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import styles from './feedback.module.css';

export interface SpinnerProps {
  size?: UiSize;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn(styles.spinner, styles[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}
