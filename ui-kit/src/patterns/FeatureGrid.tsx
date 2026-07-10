import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout';
import styles from './FeatureGrid.module.css';

export interface FeatureGridProps {
  children: ReactNode;
  className?: string;
}

export function FeatureGrid({ children, className }: FeatureGridProps) {
  return <Box className={cn(styles.grid, className)}>{children}</Box>;
}
