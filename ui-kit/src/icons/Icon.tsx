import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import styles from './icons.module.css';

const sizePx: Record<UiSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: UiSize | number;
}

export function Icon({
  icon: LucideComponent,
  size = 'md',
  className,
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  const px = typeof size === 'number' ? size : sizePx[size];

  return (
    <LucideComponent
      size={px}
      strokeWidth={strokeWidth}
      className={cn(styles.icon, className)}
      aria-hidden
      {...rest}
    />
  );
}
