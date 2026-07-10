import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import styles from './feedback.module.css';

export interface AvatarProps {
  name: string;
  size?: UiSize;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span className={cn(styles.avatar, styles[`avatar-${size}`], className)} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(styles.skeleton, className)}
      style={{ display: 'block', width, height }}
    />
  );
}
