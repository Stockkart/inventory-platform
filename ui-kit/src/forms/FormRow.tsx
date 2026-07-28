import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import styles from './forms.module.css';

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.formRow, className)}>{children}</div>;
}
