import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { UiSize } from '../utils/types';
import styles from './forms.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: UiSize;
  label: string;
  children: ReactNode;
}

export function IconButton({
  size = 'md',
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
      className={cn(styles.iconButton, styles[`iconButton-${size}`], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
