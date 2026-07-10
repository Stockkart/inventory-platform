import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout';
import styles from './PlanCardGrid.module.css';

export interface PlanCardGridProps {
  children: ReactNode;
  className?: string;
}

export function PlanCardGrid({ children, className }: PlanCardGridProps) {
  return <Box className={cn(styles.grid, className)}>{children}</Box>;
}
