import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './SocialAuthSlot.module.css';

export type SocialAuthSlotProps = {
  children: ReactNode;
  className?: string;
};

/** Full-width wrapper for third-party OAuth buttons (e.g. GoogleLogin). */
export function SocialAuthSlot({ children, className }: SocialAuthSlotProps) {
  return <Box className={cn(styles.root, className)}>{children}</Box>;
}
