import type { ReactNode } from 'react';
import styles from './PaginationBar.module.css';

export type PaginationBarProps = {
  /** 0-based page index */
  page: number;
  onPageChange: (nextPageZeroBased: number) => void;
  disabled?: boolean;
  /** When set (and `middleContent` is not), renders “Page a of b • totals”. */
  totalPages?: number;
  totalItems?: number;
  /** When `totalPages` is unknown, renders “Page a” unless overridden. */
  middleContent?: ReactNode;
  /** Override prev/next disables (e.g. client-side paging without totalPages). */
  prevDisabled?: boolean;
  nextDisabled?: boolean;

  /** Page-size select; supply all three to show selector (Contact-style). */
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  /** Accessible label when page size select is shown */
  pageSizeLabel?: string;

  /** Tuck into toolbars (no top border/margin on the bar). */
  compact?: boolean;

  className?: string;
  'aria-label'?: string;
};

export function PaginationBar({
  page,
  onPageChange,
  disabled,
  totalPages,
  totalItems,
  middleContent,
  prevDisabled,
  nextDisabled,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  pageSizeLabel = 'Rows per page',
  compact,
  className,
  'aria-label': ariaLabel = 'Pagination',
}: PaginationBarProps) {
  const safeTotalPages =
    totalPages !== undefined ? Math.max(1, totalPages) : undefined;

  const d = disabled === true;
  const defaultPrevDisabled = d || page <= 0;
  const prevIsDisabled =
    prevDisabled ?? defaultPrevDisabled;

  const defaultNextDisabled =
    d ||
    (safeTotalPages !== undefined &&
      (safeTotalPages <= 1 || page >= safeTotalPages - 1));
  const nextIsDisabled = nextDisabled ?? defaultNextDisabled;

  const middle: ReactNode =
    middleContent ??
    (safeTotalPages !== undefined ? (
      <span className={styles.pageInfo}>
        Page {page + 1} of {safeTotalPages}
        {totalItems != null ? ` • ${totalItems} total` : ''}
      </span>
    ) : (
      <span className={styles.pageInfo}>Page {page + 1}</span>
    ));

  const showSizeSelect =
    typeof pageSize === 'number' &&
    typeof onPageSizeChange === 'function' &&
    (pageSizeOptions?.length ?? 0) > 0;

  return (
    <nav
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      <div className={[styles.bar, compact ? styles.barCompact : ''].filter(Boolean).join(' ')}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={prevIsDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        {middle}
        <button
          type="button"
          className={styles.pageBtn}
          disabled={nextIsDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>

        {showSizeSelect ? (
          <label className={styles.pageSizeLabel}>
            <span className={styles.srOnly}>{pageSizeLabel}</span>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions!.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </nav>
  );
}
