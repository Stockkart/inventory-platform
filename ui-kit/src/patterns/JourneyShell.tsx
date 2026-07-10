import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import { Stack } from '../layout/Stack';
import styles from './JourneyShell.module.css';

export type JourneyShellProps = {
  children: ReactNode;
  /** Fixed marketing/auth header offset (default true). */
  withHeaderOffset?: boolean;
  className?: string;
};

/** Full-viewport auth/onboarding shell under a fixed JourneyHeader. */
export function JourneyShell({ children, withHeaderOffset = true, className }: JourneyShellProps) {
  return (
    <Stack
      minHeight="screen"
      bg="canvas"
      className={cn(withHeaderOffset && styles.withHeaderOffset, className)}
    >
      {children}
    </Stack>
  );
}

export type JourneyMainProps = {
  children: ReactNode;
  className?: string;
};

export function JourneyMain({ children, className }: JourneyMainProps) {
  return (
    <Box
      as="main"
      display="flex"
      flex="1"
      align="center"
      justify="center"
      padding="lg"
      className={className}
    >
      {children}
    </Box>
  );
}

export const journeyChrome = {
  header: styles.header,
  logo: styles.logo,
  stepMuted: styles.stepMuted,
  onboardingSidebar: styles.onboardingSidebar,
  onboardingSidebarCompact: styles.onboardingSidebarCompact,
} as const;
