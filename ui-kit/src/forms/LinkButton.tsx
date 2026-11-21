import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import styles from './forms.module.css';

export interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Cut long text with an ellipsis instead of widening the cell. */
  truncate?: boolean;
}

/**
 * A button that looks like a link: for "click to open" values such as an entry number, an
 * employee name or a month in a list. It stays a real `<button>` (keyboard, focus ring), so use
 * it for in-app navigation or opening a drawer; use `Link` for a plain `href`.
 * Same look as accounting's entry links: `accountingChrome.entryLink` is this class on a ghost
 * `Button`, which is exactly what this renders.
 */
export function LinkButton({ className, children, truncate = false, ...rest }: LinkButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(styles.linkButton, truncate && styles.linkButtonTruncate, className)}
      {...rest}
    >
      {children}
    </Button>
  );
}
