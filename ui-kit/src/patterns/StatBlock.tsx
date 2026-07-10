import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box, Stack, Text } from '../layout';
import styles from './StatBlock.module.css';

export interface StatBlockProps {
  value: string;
  label: string;
  /** Soften the value (e.g. "---" placeholders). */
  placeholder?: boolean;
  className?: string;
}

export function StatBlock({ value, label, placeholder = false, className }: StatBlockProps) {
  return (
    <Stack
      gap="sm"
      align="center"
      className={cn(styles.stat, placeholder && styles.placeholder, className)}
    >
      <Text as="span" className={styles.value}>
        {value}
      </Text>
      <Text as="span" className={styles.label}>
        {label}
      </Text>
    </Stack>
  );
}

export interface StatsRowProps {
  children: ReactNode;
  className?: string;
}

export function StatsRow({ children, className }: StatsRowProps) {
  return <Box className={cn(styles.row, className)}>{children}</Box>;
}
