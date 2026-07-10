import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
  TableHTMLAttributes,
} from 'react';
import { cn } from '../utils/cn';
import { CenteredLoader } from '../feedback/CenteredLoader';
import styles from './data-display.module.css';

export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className={styles.tableWrap}>
      <table className={cn(styles.table, className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(styles.thead, props.className)} {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TableHeaderCell(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn(styles.th, props.className)} {...props} />;
}

export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(styles.td, props.className)} {...props} />;
}

export interface TableStatusRowProps extends TdHTMLAttributes<HTMLTableCellElement> {
  colSpan: number;
}

export function TableLoadingRow({
  colSpan,
  label = 'Loading…',
  className,
  minHeight = '4rem',
  ...rest
}: TableStatusRowProps & { label?: string; minHeight?: string }) {
  return (
    <TableRow>
      <td colSpan={colSpan} className={cn(styles.statusCell, className)} {...rest}>
        <CenteredLoader label={label} size="sm" minHeight={minHeight} />
      </td>
    </TableRow>
  );
}

export function TableEmptyRow({
  colSpan,
  message = 'No results.',
  className,
  minHeight,
  ...rest
}: TableStatusRowProps & { message?: string; minHeight?: string }) {
  return (
    <TableRow>
      <td colSpan={colSpan} className={cn(styles.statusCell, className)} {...rest}>
        <div className={styles.statusMessage} style={minHeight ? { minHeight } : undefined}>
          {message}
        </div>
      </td>
    </TableRow>
  );
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.card, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.cardHeader, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.cardBody, className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.cardFooter, className)} {...rest}>
      {children}
    </div>
  );
}

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: ReactNode; panel: ReactNode }>;
  className?: string;
}

export function Tabs({ value, onChange, items, className }: TabsProps) {
  const active = items.find((item) => item.value === value) ?? items[0];

  return (
    <div className={cn(styles.tabs, className)}>
      <div className={styles.tabList} role="tablist">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={item.value === value}
            className={cn(styles.tab, item.value === value && styles.tabActive)}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {active?.panel}
      </div>
    </div>
  );
}
