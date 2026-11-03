import { useRef, useState } from 'react';
import type {
  DragEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  ThHTMLAttributes,
} from 'react';
import { ArrowDown, ArrowUp, Lock, RotateCcw, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import { Inline, Stack } from '../layout/Stack';
import { Text } from '../layout/Text';
import { Button } from '../forms/Button';
import { IconButton } from '../forms/IconButton';
import { Checkbox } from '../forms/Label';
import { Input } from '../forms/Input';
import { Icon } from '../icons/Icon';
import { Drawer } from '../overlay/Modal';
import { TableHeaderCell } from '../data-display/Table';
import styles from './GridColumns.module.css';

/** Pixel step for keyboard resizing (arrow keys on a focused resize handle). */
const KEYBOARD_RESIZE_STEP_PX = 10;
const DRAG_MIME = 'application/x-sk-grid-column';

export type GridColGroupProps = {
  /** Width of each visible column in display order. */
  widths: number[];
};

/**
 * Column widths for a fixed-layout dense grid. Pair with `denseDataGrid.tableFixed` on the table
 * so the widths are honoured rather than stretched to the content.
 */
export function GridColGroup({ widths }: GridColGroupProps) {
  return (
    <colgroup>
      {widths.map((width, idx) => (
        <col key={idx} style={{ width: `${width}px` }} />
      ))}
    </colgroup>
  );
}

export type ResizableHeaderCellProps = Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'onDrop' | 'onResize'
> & {
  /** Stable column key; identifies the column for reordering. */
  columnKey: string;
  widthPx: number;
  minWidthPx: number;
  maxWidthPx: number;
  /** Text for the resize handle's accessible name. */
  label: string;
  /** Live width while dragging the handle. */
  onResize: (widthPx: number) => void;
  /** Final width when the drag (or key press) ends. */
  onResizeEnd: (widthPx: number) => void;
  /** When set, the header can be dragged onto another movable header. */
  onReorder?: (fromKey: string, toKey: string) => void;
  children: ReactNode;
};

/**
 * A dense-grid header cell with a resize handle on its right edge and, when `onReorder` is given,
 * drag-to-reorder. Presentation only: the caller owns widths and order.
 */
export function ResizableHeaderCell({
  columnKey,
  widthPx,
  minWidthPx,
  maxWidthPx,
  label,
  onResize,
  onResizeEnd,
  onReorder,
  className,
  children,
  ...rest
}: ResizableHeaderCellProps) {
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const lastWidth = useRef(widthPx);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);

  const clamp = (w: number) => Math.round(Math.max(minWidthPx, Math.min(maxWidthPx, w)));

  const onHandlePointerDown = (e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, width: widthPx };
    lastWidth.current = widthPx;
    setResizing(true);
  };

  const onHandlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!dragStart.current) {
      return;
    }
    const next = clamp(dragStart.current.width + e.clientX - dragStart.current.x);
    if (next !== lastWidth.current) {
      lastWidth.current = next;
      onResize(next);
    }
  };

  const onHandlePointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!dragStart.current) {
      return;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    const changed = lastWidth.current !== dragStart.current.width;
    dragStart.current = null;
    setResizing(false);
    if (changed) {
      onResizeEnd(lastWidth.current);
    }
  };

  const onHandleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const next = clamp(
      widthPx + (e.key === 'ArrowRight' ? KEYBOARD_RESIZE_STEP_PX : -KEYBOARD_RESIZE_STEP_PX),
    );
    if (next !== widthPx) {
      onResize(next);
      onResizeEnd(next);
    }
  };

  const reorderProps = onReorder
    ? {
        draggable: !resizing,
        onDragStart: (e: DragEvent<HTMLTableCellElement>) => {
          if (resizing) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData(DRAG_MIME, columnKey);
          e.dataTransfer.effectAllowed = 'move';
          setDragging(true);
        },
        onDragEnd: () => setDragging(false),
        onDragOver: (e: DragEvent<HTMLTableCellElement>) => {
          if (e.dataTransfer.types.includes(DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget(true);
          }
        },
        onDragLeave: () => setDropTarget(false),
        onDrop: (e: DragEvent<HTMLTableCellElement>) => {
          setDropTarget(false);
          const fromKey = e.dataTransfer.getData(DRAG_MIME);
          if (fromKey && fromKey !== columnKey) {
            e.preventDefault();
            onReorder(fromKey, columnKey);
          }
        },
      }
    : {};

  return (
    <TableHeaderCell
      {...rest}
      {...reorderProps}
      className={cn(
        styles.headerCell,
        onReorder && styles.headerMovable,
        dragging && styles.headerDragging,
        dropTarget && styles.headerDropTarget,
        className,
      )}
    >
      {children}
      <Box
        as="span"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${label}`}
        aria-valuenow={widthPx}
        aria-valuemin={minWidthPx}
        aria-valuemax={maxWidthPx}
        tabIndex={0}
        className={cn(styles.resizeHandle, resizing && styles.resizeHandleActive)}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onKeyDown={onHandleKeyDown}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      />
    </TableHeaderCell>
  );
}

export type ColumnManagerItem = {
  key: string;
  label: string;
  hidden: boolean;
  /** Mandatory: cannot be hidden. */
  locked: boolean;
  /** False for columns pinned to the start or end. */
  movable: boolean;
  /** Set (with `onWidthChange`) to show a width field. */
  widthPx?: number;
  minWidthPx?: number;
  maxWidthPx?: number;
};

export type ColumnListProps = {
  columns: ColumnManagerItem[];
  onMove: (key: string, direction: -1 | 1) => void;
  onToggleHidden: (key: string, hidden: boolean) => void;
  /** When given, each column with a `widthPx` gets a width (px) field. */
  onWidthChange?: (key: string, widthPx: number) => void;
  disabled?: boolean;
};

/**
 * Column rows: show/hide checkbox (locked columns show a lock), up/down for movable columns and,
 * optionally, a width field. Used inside `ColumnManager` and on settings pages.
 */
export function ColumnList({
  columns,
  onMove,
  onToggleHidden,
  onWidthChange,
  disabled = false,
}: ColumnListProps) {
  const movable = columns.filter((c) => c.movable);
  return (
    <Box as="ul" className={styles.managerList} flex="1" minHeight="0">
      {columns.map((column) => {
        const pos = movable.findIndex((c) => c.key === column.key);
        return (
          <Box as="li" key={column.key} className={styles.managerRow}>
            <Inline justify="between" gap="sm">
              <Inline gap="xs" minWidth="0">
                <Checkbox
                  id={`grid-col-${column.key}`}
                  label={column.label}
                  checked={!column.hidden}
                  disabled={disabled || column.locked}
                  onChange={(e) => onToggleHidden(column.key, !e.target.checked)}
                />
                {column.locked ? (
                  <Box as="span" title="Required column — cannot be hidden">
                    <Icon icon={Lock} size={14} aria-label="Required" />
                  </Box>
                ) : null}
              </Inline>
              <Inline gap="xs">
                {onWidthChange && column.widthPx != null ? (
                  <WidthField
                    columnKey={column.key}
                    label={column.label}
                    widthPx={column.widthPx}
                    minWidthPx={column.minWidthPx ?? 1}
                    maxWidthPx={column.maxWidthPx ?? 2000}
                    disabled={disabled}
                    onCommit={(w) => onWidthChange(column.key, w)}
                  />
                ) : null}
                {column.movable ? (
                  <>
                    <IconButton
                      size="sm"
                      label={`Move ${column.label} up`}
                      disabled={disabled || pos <= 0}
                      onClick={() => onMove(column.key, -1)}
                    >
                      <Icon icon={ArrowUp} size="sm" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`Move ${column.label} down`}
                      disabled={disabled || pos < 0 || pos >= movable.length - 1}
                      onClick={() => onMove(column.key, 1)}
                    >
                      <Icon icon={ArrowDown} size="sm" />
                    </IconButton>
                  </>
                ) : null}
              </Inline>
            </Inline>
          </Box>
        );
      })}
    </Box>
  );
}

/** Width in px; commits a clamped value on blur or Enter. */
function WidthField({
  columnKey,
  label,
  widthPx,
  minWidthPx,
  maxWidthPx,
  disabled,
  onCommit,
}: {
  columnKey: string;
  label: string;
  widthPx: number;
  minWidthPx: number;
  maxWidthPx: number;
  disabled: boolean;
  onCommit: (widthPx: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) {
      return;
    }
    const n = Math.round(Number(draft));
    setDraft(null);
    if (Number.isFinite(n) && n > 0) {
      const clamped = Math.max(minWidthPx, Math.min(maxWidthPx, n));
      if (clamped !== widthPx) {
        onCommit(clamped);
      }
    }
  };
  return (
    <Inline gap="xs">
      <Input
        id={`grid-col-width-${columnKey}`}
        type="number"
        inputMode="numeric"
        min={minWidthPx}
        max={maxWidthPx}
        aria-label={`${label} width in pixels`}
        className={styles.widthInput}
        value={draft ?? String(widthPx)}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
          }
        }}
      />
      <Text variant="caption" color="secondary">
        px
      </Text>
    </Inline>
  );
}

export type ColumnManagerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Short line under the title, e.g. who the layout applies to. */
  description?: ReactNode;
  columns: ColumnManagerItem[];
  onMove: (key: string, direction: -1 | 1) => void;
  onToggleHidden: (key: string, hidden: boolean) => void;
  onReset: () => void;
  resetting?: boolean;
  disabled?: boolean;
};

/** Side drawer to reorder and show/hide grid columns. Mandatory columns show a lock. */
export function ColumnManager({
  open,
  onClose,
  title = 'Columns',
  description,
  columns,
  onMove,
  onToggleHidden,
  onReset,
  resetting = false,
  disabled = false,
}: ColumnManagerProps) {
  return (
    <Drawer open={open} side="right" onClose={onClose} labelledBy="grid-column-manager-title">
      <Stack gap="md" padding="lg" height="full" minHeight="0">
        <Inline justify="between" gap="sm">
          <Text as="h2" variant="heading4" id="grid-column-manager-title">
            {title}
          </Text>
          <IconButton label="Close" onClick={onClose}>
            <Icon icon={X} size="sm" />
          </IconButton>
        </Inline>
        {description ? (
          <Text variant="caption" color="secondary">
            {description}
          </Text>
        ) : null}
        <ColumnList
          columns={columns}
          onMove={onMove}
          onToggleHidden={onToggleHidden}
          disabled={disabled}
        />
        <Inline justify="end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={disabled || resetting}
          >
            <Icon icon={RotateCcw} size="sm" />
            Reset to default
          </Button>
        </Inline>
      </Stack>
    </Drawer>
  );
}
