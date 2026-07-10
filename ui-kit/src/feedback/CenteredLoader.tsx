import type { CSSProperties } from 'react';
import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import { Spinner } from './Spinner';
import styles from './feedback.module.css';

export interface CenteredLoaderProps {
  label?: string;
  size?: UiSize;
  /** Minimum block height so the loader sits in the visual center of its parent. */
  minHeight?: string;
  /** Stretch to fill a parent with a defined height. */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function CenteredLoader({
  label = 'Loading…',
  size = 'md',
  minHeight = '14rem',
  fill = false,
  className,
  style,
}: CenteredLoaderProps) {
  return (
    <div
      className={cn(styles.centeredLoader, fill && styles.centeredLoaderFill, className)}
      style={{
        ...(minHeight && !fill ? { minHeight } : undefined),
        ...style,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size={size} />
      {label ? <span className={styles.centeredLoaderLabel}>{label}</span> : null}
    </div>
  );
}
