import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './AppShell.module.css';

export type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  header?: ReactNode;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  mobileMenuButton?: ReactNode;
  className?: string;
};

/**
 * Dashboard chrome: collapsible fixed sidebar + sticky main header + mobile drawer.
 * Owns the shell layout CSS so domains/shell don't need local modules.
 */
export function AppShell({
  children,
  sidebar,
  header,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  mobileMenuButton,
  className,
}: AppShellProps) {
  return (
    <Box
      className={cn(styles.shell, collapsed && styles.shellCollapsed, className)}
      bg="canvas"
      height="full"
    >
      {mobileMenuButton ? (
        <Box className={styles.mobileMenuFloating}>{mobileMenuButton}</Box>
      ) : null}
      {mobileOpen ? (
        <Box className={styles.sidebarBackdropVisible} onClick={onMobileClose} aria-hidden />
      ) : null}
      <Box className={styles.shellBody}>
        <Box className={styles.sidebarColumn}>
          <Box
            className={cn(styles.sidebar, mobileOpen ? styles.sidebarOpen : styles.sidebarClosed)}
            bg="surface"
            border
          >
            {sidebar}
          </Box>
        </Box>
        <Box display="flex" flexDirection="column" width="full" style={{ minWidth: 0 }}>
          {header ? <Box className={styles.shellHeader}>{header}</Box> : null}
          <Box padding="md" style={{ flex: 1, minWidth: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export type NavItemProps = {
  children: ReactNode;
  active?: boolean;
  className?: string;
  asChild?: boolean;
};

/** Styles for sidebar nav links (hover / active). Apply to react-router Link via className. */
export function navItemClassName(active?: boolean, className?: string) {
  return cn(styles.navLink, active && styles.navLinkActive, className);
}

export function PopoverPanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Box className={cn(styles.popover, className)} style={style}>
      {children}
    </Box>
  );
}

export function NotificationDot({ className }: { className?: string }) {
  return <Box className={cn(styles.notificationBadge, className)} aria-hidden />;
}
