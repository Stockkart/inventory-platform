import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { LinkTone } from '../utils/types';
import styles from './forms.module.css';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  /** Visual tone. `nav` is for marketing headers (no underline). */
  tone?: LinkTone;
}

export function Link({ className, children, tone = 'accent', ...rest }: LinkProps) {
  return (
    <a
      className={cn(
        styles.link,
        tone === 'brand' && styles.linkBrand,
        tone === 'muted' && styles.linkMuted,
        tone === 'nav' && styles.linkNav,
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
