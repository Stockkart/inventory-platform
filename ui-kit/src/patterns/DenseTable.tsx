import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './DenseTable.module.css';

export type DenseTableProps = {
  children: ReactNode;
  className?: string;
};

/** Scrollable container for dense POS / spreadsheet-style tables. */
export function DenseTable({ children, className }: DenseTableProps) {
  return (
    <Box overflow="auto" className={cn(styles.root, className)}>
      <div className={styles.tableWrap}>{children}</div>
    </Box>
  );
}

export function DenseTableSurface({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn(styles.table, className)} {...rest}>
      {children}
    </table>
  );
}

export function DenseTableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(styles.tr, className)} {...rest} />;
}

export function DenseTableHeaderCell({
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn(styles.th, className)} {...rest} />;
}

export function DenseTableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(styles.td, className)} {...rest} />;
}

export const denseTableClassNames = {
  productBtn: styles.productBtn,
  cellInput: styles.cellInput,
  select: styles.select,
  priceCell: styles.priceCell,
  rateSelect: styles.rateSelect,
  cellAdditionalInput: styles.cellAdditionalInput,
} as const;
