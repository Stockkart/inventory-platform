import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import styles from './forms.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: UiSize;
  /** `circle` for round header/chrome actions. */
  shape?: 'square' | 'circle';
  label: string;
  children: ReactNode;
}

export function IconButton({
  size = 'md',
  shape = 'square',
  label,
  children,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        styles.iconButton,
        styles[`iconButton-${size}`],
        shape === 'circle' && styles.iconButtonCircle,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
