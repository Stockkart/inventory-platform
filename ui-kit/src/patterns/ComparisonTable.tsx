import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import styles from './ComparisonTable.module.css';

export interface ComparisonColumn {
  key: string;
  header: ReactNode;
  highlighted?: boolean;
}

export interface ComparisonRow {
  key: string;
  label: ReactNode;
  /** Cell per column key; a missing key renders empty. */
  cells: Record<string, ReactNode>;
}

export interface ComparisonTableProps {
  /** Read by screen readers only. */
  caption: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  /** Header above the row labels. */
  cornerLabel?: ReactNode;
  className?: string;
}

/** Feature-by-option grid. Row labels stay pinned while the columns scroll on narrow screens. */
export function ComparisonTable({
  caption,
  columns,
  rows,
  cornerLabel,
  className,
}: ComparisonTableProps) {
  return (
    <div className={cn(styles.scroll, className)}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(styles.cell, styles.corner)}>
              {cornerLabel}
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  styles.cell,
                  styles.colHeader,
                  column.highlighted && styles.highlighted,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={styles.row}>
              <th scope="row" className={cn(styles.cell, styles.rowHeader)}>
                {row.label}
              </th>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    styles.cell,
                    styles.value,
                    column.highlighted && styles.highlighted,
                  )}
                >
                  {row.cells[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
