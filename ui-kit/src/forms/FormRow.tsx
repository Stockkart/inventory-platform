import type { ReactNode } from 'react';
import styles from './forms.module.css';

export function FormRow({ children }: { children: ReactNode }) {
  return <div className={styles.formRow}>{children}</div>;
}
