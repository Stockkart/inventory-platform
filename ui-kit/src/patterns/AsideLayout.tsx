import type { CSSProperties, ReactNode, HTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './AsideLayout.module.css';

export type AsideLayoutProps = {
  main: ReactNode;
  aside: ReactNode;
  /** Aside width in px (default 380). */
  asideWidth?: number;
  className?: string;
};

/** Main content + fixed-width summary aside (POS / detail layouts). */
export function AsideLayout({ main, aside, asideWidth = 380, className }: AsideLayoutProps) {
  return (
    <Box
      className={cn(styles.root, className)}
      display="flex"
      gap="md"
      style={{ ['--aside-width' as string]: `${asideWidth}px` } as CSSProperties}
    >
      <Box className={styles.main}>{main}</Box>
      <Box className={styles.aside}>{aside}</Box>
    </Box>
  );
}

export type SearchDropdownProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'>;

/** Absolutely positioned results panel under a search field. */
export function SearchDropdown({ children, className, ...rest }: SearchDropdownProps) {
  return (
    <Box className={cn(styles.dropdown, className)} {...rest}>
      {children}
    </Box>
  );
}

export type StickyBarProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Pin to viewport bottom (e.g. cafe POS checkout). */
  fixed?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'style'>;

/** Bottom sticky action bar (e.g. cafe checkout). */
export function StickyBar({ children, className, style, fixed, ...rest }: StickyBarProps) {
  return (
    <Box
      className={cn(styles.stickyBar, fixed && styles.stickyBarFixed, className)}
      style={style}
      {...rest}
    >
      {children}
    </Box>
  );
}
