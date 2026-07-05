import { cn } from '../utils/cn';
import type { SpacingScale } from '../utils/types';
import styles from './Divider.module.css';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  label,
  className,
}: DividerProps) {
  if (label) {
    return (
      <div className={cn(styles.withLabel, className)} role="separator">
        <span>{label}</span>
      </div>
    );
  }

  return (
    <hr
      className={cn(
        styles.divider,
        orientation === 'vertical' ? styles.vertical : styles.horizontal,
        className
      )}
    />
  );
}

export interface SpacerProps {
  size?: SpacingScale;
  axis?: 'horizontal' | 'vertical';
  className?: string;
}

const spacerSize: Record<SpacingScale, string> = {
  none: 'var(--sk-space-none)',
  xs: 'var(--sk-space-xs)',
  sm: 'var(--sk-space-sm)',
  md: 'var(--sk-space-md)',
  lg: 'var(--sk-space-lg)',
  xl: 'var(--sk-space-xl)',
};

export function Spacer({
  size = 'md',
  axis = 'vertical',
  className,
}: SpacerProps) {
  const dimension = spacerSize[size];
  return (
    <span
      aria-hidden
      className={className}
      style={
        axis === 'vertical'
          ? { display: 'block', height: dimension, width: '100%' }
          : { display: 'inline-block', width: dimension, height: '1px' }
      }
    />
  );
}
