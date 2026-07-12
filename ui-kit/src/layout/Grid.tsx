import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { SpacingScale } from '../utils/types';
import styles from './Grid.module.css';

export interface GridProps {
  children?: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: SpacingScale;
  width?: 'full';
}

export function Grid({ children, className, columns = 1, gap = 'md', width }: GridProps) {
  return (
    <div
      className={cn(
        styles.grid,
        styles[`cols-${columns}`],
        styles[`gap-${gap}`],
        width === 'full' && styles['w-full'],
        className,
      )}
    >
      {children}
    </div>
  );
}
