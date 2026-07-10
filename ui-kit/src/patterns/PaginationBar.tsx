import type { ReactNode, KeyboardEvent } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../forms/Button';
import { Select } from '../forms/Select';
import { Input } from '../forms/Input';
import { Text } from '../layout/Text';
import { Stack } from '../layout/Stack';
import { Inline } from '../layout/Stack';
import { VisuallyHidden } from '../layout/VisuallyHidden';
import { Modal } from '../overlay/Modal';
import { Alert } from '../feedback/Alert';
import styles from './patterns.module.css';

export type PaginationBarProps = {
  page: number;
  onPageChange: (nextPageZeroBased: number) => void;
  disabled?: boolean;
  totalPages?: number;
  totalItems?: number;
  middleContent?: ReactNode;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  pageSizeLabel?: string;
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
  const safeTotalPages = totalPages !== undefined ? Math.max(1, totalPages) : undefined;

  const d = disabled === true;
  const prevIsDisabled = prevDisabled ?? (d || page <= 0);
  const nextIsDisabled =
    nextDisabled ??
    (d || (safeTotalPages !== undefined && (safeTotalPages <= 1 || page >= safeTotalPages - 1)));

  const middle: ReactNode =
    middleContent ??
    (safeTotalPages !== undefined ? (
      <Text variant="caption" className={styles.pageInfo}>
        Page {page + 1} of {safeTotalPages}
        {totalItems != null ? ` • ${totalItems} total` : ''}
      </Text>
    ) : (
      <Text variant="caption" className={styles.pageInfo}>
        Page {page + 1}
      </Text>
    ));

  const showSizeSelect =
    typeof pageSize === 'number' &&
    typeof onPageSizeChange === 'function' &&
    (pageSizeOptions?.length ?? 0) > 0;

  return (
    <nav className={cn(styles.wrapper, className)} aria-label={ariaLabel}>
      <Inline className={cn(styles.bar, compact && styles.barCompact)} justify="end">
        <Button
          variant="outline"
          size="sm"
          disabled={prevIsDisabled}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {middle}
        <Button
          variant="outline"
          size="sm"
          disabled={nextIsDisabled}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        {showSizeSelect ? (
          <label className={styles.pageSizeLabel}>
            <VisuallyHidden>{pageSizeLabel}</VisuallyHidden>
            <Select
              value={String(pageSize)}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions!.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </Inline>
    </nav>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <Stack className={cn(styles.emptyState, className)} align="center">
      <Text variant="title">{title}</Text>
      {description ? <Text color="secondary">{description}</Text> : null}
      {action}
    </Stack>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(styles.pageHeader, className)}>
      <Stack gap="xs">
        <Text variant="heading2">{title}</Text>
        {description ? <Text color="secondary">{description}</Text> : null}
      </Stack>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </div>
  );
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  searchLabel?: string;
  showSearchButton?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search…',
  searchLabel = 'Search',
  showSearchButton = false,
  className,
  disabled,
}: SearchInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      e.preventDefault();
      onSearch();
    }
  };

  if (!showSearchButton) {
    return (
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(styles.searchInput, className)}
      />
    );
  }

  return (
    <Inline className={cn(styles.searchToolbar, className)} gap="sm">
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={styles.searchInput}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onSearch}>
        {searchLabel}
      </Button>
    </Inline>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <Modal.Header title={title} onClose={onCancel} />
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" loading={loading} onClick={() => void onConfirm()}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export interface EditModalProps {
  open: boolean;
  title: string;
  error?: string | null;
  children: ReactNode;
  saving?: boolean;
  saveLabel?: string;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}

export function EditModal({
  open,
  title,
  error,
  children,
  saving = false,
  saveLabel = 'Save',
  onClose,
  onCancel,
  onSave,
}: EditModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header title={title} onClose={onClose} />
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {children}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="solid" loading={saving} onClick={() => void onSave()}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
