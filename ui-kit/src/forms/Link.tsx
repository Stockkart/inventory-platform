import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

export function Link({ className, children, ...rest }: LinkProps) {
  return (
    <a className={cn(styles.link, className)} {...rest}>
      {children}
    </a>
  );
}
