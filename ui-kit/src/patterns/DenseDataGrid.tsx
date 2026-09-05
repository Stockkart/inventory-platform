import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import styles from './DenseDataGrid.module.css';

/** Class names for dense spreadsheet-style data grids (sticky headers, compact inputs). */
export const denseDataGrid = {
  srOnly: styles.srOnly,
  wrap: styles.wrap,
  table: styles.table,
  th: styles.th,
  bulkRow: styles.bulkRow,
  bulkTh: styles.bulkTh,
  bulkLabel: styles.bulkLabel,
  bulkApplyBtn: styles.bulkApplyBtn,
  bulkDisabled: styles.bulkDisabled,
  tr: styles.tr,
  td: styles.td,
  tdPackaging: styles.tdPackaging,
  input: styles.input,
  inputNarrow: styles.inputNarrow,
  inputDate: styles.inputDate,
  select: styles.select,
  cellDash: styles.cellDash,
  footnote: styles.footnote,
} as const;

export type DenseDataGridWrapProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Scrollable wrapper for a dense data grid table. */
export function DenseDataGridWrap({ className, children, ...rest }: DenseDataGridWrapProps) {
  return (
    <div className={cn(denseDataGrid.wrap, className)} {...rest}>
      {children}
    </div>
  );
}
