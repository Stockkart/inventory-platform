import type { ReactNode } from 'react';
import styles from './forms.module.css';

interface FormRowProps {
  children: ReactNode;
}

export function FormRow({ children }: FormRowProps) {
  return <div className={styles.formRow}>{children}</div>;
}
