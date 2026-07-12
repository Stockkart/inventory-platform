import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box, Stack } from '../layout';
import styles from './MarketingSection.module.css';

export type MarketingSectionTone = 'canvas' | 'surface' | 'muted';
export type MarketingSectionWidth = 'sm' | 'md' | 'lg' | 'xl';
export type MarketingSectionDensity = 'default' | 'compact' | 'snug';

export interface MarketingSectionProps {
  children: ReactNode;
  id?: string;
  tone?: MarketingSectionTone;
  maxWidth?: MarketingSectionWidth;
  /** `compact` = tight both sides; `snug` = less top padding only. */
  density?: MarketingSectionDensity;
  className?: string;
}

export function MarketingSection({
  children,
  id,
  tone = 'canvas',
  maxWidth = 'xl',
  density = 'default',
  className,
}: MarketingSectionProps) {
  return (
    <Box
      as="section"
      id={id}
      className={cn(
        styles.section,
        styles[`tone-${tone}`],
        density === 'compact' && styles['density-compact'],
        density === 'snug' && styles['density-snug'],
        className,
      )}
    >
      <Stack
        gap={density === 'compact' ? 'md' : 'xl'}
        className={cn(styles.inner, styles[`inner-${maxWidth}`])}
      >
        {children}
      </Stack>
    </Box>
  );
}
