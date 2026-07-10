import type { CSSProperties } from 'react';
import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import { Spinner } from './Spinner';
import styles from './feedback.module.css';

/** Fills the viewport below the sticky app header so the spinner sits mid-screen. */
const PAGE_LOADER_MIN_HEIGHT =
  'calc(100dvh - var(--header-height, 64px) - var(--sk-space-xl, 2rem))';

export interface CenteredLoaderProps {
  label?: string;
  size?: UiSize;
  /**
   * Minimum block height. Defaults to remaining viewport under the header
   * for page-level loaders (`size` md/lg). `size="sm"` defaults to `4rem`.
   */
  minHeight?: string;
  /** Stretch inside a flex parent that already has a defined height. */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function CenteredLoader({
  label = 'Loading…',
  size = 'md',
  minHeight,
  fill = false,
  className,
  style,
}: CenteredLoaderProps) {
  const resolvedMinHeight = minHeight ?? (size === 'sm' ? '4rem' : PAGE_LOADER_MIN_HEIGHT);

  return (
    <div
      className={cn(styles.centeredLoader, fill && styles.centeredLoaderFill, className)}
      style={{
        minHeight: resolvedMinHeight,
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
