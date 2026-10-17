import { Fragment, useMemo, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Columns3 } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  ColumnManager,
  GridColGroup,
  Icon,
  Inline,
  ResizableHeaderCell,
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  denseDataGrid,
} from '@inventory-platform/ui-kit';
import { GRID_IDS } from '../../model/gridLayout.types';
import type { GridLayoutChange } from '../../model/gridLayout.types';
import {
  useChangeGridLayoutMutation,
  useGridLayoutQuery,
  useResetGridLayoutMutation,
} from '../../queries/gridLayout.queries';
import { dropMove, layoutColumns, stepMove } from '../../lib/gridLayoutModel';

/** One grid column: its key in the shop layout, header, fill-row control and row cell. */
export interface ProductEntryGridColumn<Row> {
  key: string;
  /** Plain name for the Columns drawer and the resize handle. */
  label: string;
  header: ReactNode;
  headerTitle?: string;
  headerClassName?: string;
  /** Content of this column's cell in the "Fill all" row. */
  bulk: ReactNode;
  /** The row's whole `<TableCell>`. */
  cell: (row: Row, index: number) => ReactNode;
}

export interface ProductEntryGridProps<Row> {
  columns: ProductEntryGridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Remounts the table (e.g. on billing-mode change). */
  tableKey?: string;
  /** Props for the scrolling wrap (keyboard navigation). */
  wrapProps?: HTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
  footer?: ReactNode;
}

/**
 * The product entry grid with the shop's shared column layout: widths, order and hidden columns
 * come from the server and apply to every member; scroll position stays in this browser. Owners
 * and admins (`canEdit`) can resize and drag headers and open the Columns drawer. Until the
 * layout loads the grid renders with content-sized columns, as before.
 */
export function ProductEntryGrid<Row>({
  columns,
  rows,
  rowKey,
  tableKey,
  wrapProps,
  footer,
}: ProductEntryGridProps<Row>) {
  const gridId = GRID_IDS.PRODUCT_ENTRY;
  const layoutQuery = useGridLayoutQuery(gridId);
  const changeMutation = useChangeGridLayoutMutation(gridId);
  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});

  const layout = layoutQuery.data;
  const canEdit = layout?.canEdit === true;
  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const laidOut = useMemo(
    () =>
      layoutColumns(
        columns.map((c) => c.key),
        layout,
      ),
    [columns, layout],
  );
  const visible = laidOut.filter((c) => !c.hidden);
  const widthOf = (key: string, saved: number) => draftWidths[key] ?? saved;
  const fixed = layout != null;
  const tableWidth = visible.reduce((sum, c) => sum + widthOf(c.key, c.widthPx), 0);

  const send = (change: GridLayoutChange | null) => {
    if (change) {
      changeMutation.mutate(change);
    }
  };

  const onResizeEnd = (key: string, widthPx: number) => {
    send({ type: 'RESIZE', key, widthPx });
    setDraftWidths((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <>
      <ProductEntryColumnsBar
        columns={columns}
        caption="Column widths and order are shared with everyone in this shop. Drag a header edge to resize, drag a header to move it."
        allowReorder
      />
      {changeMutation.error ? <LayoutSaveError error={changeMutation.error} /> : null}
      <Box className={denseDataGrid.wrap} {...wrapProps}>
        <Table
          key={tableKey}
          className={
            fixed ? `${denseDataGrid.table} ${denseDataGrid.tableFixed}` : denseDataGrid.table
          }
          style={fixed ? { width: `${tableWidth}px` } : undefined}
        >
          {fixed ? <GridColGroup widths={visible.map((c) => widthOf(c.key, c.widthPx))} /> : null}
          <TableHead>
            <TableRow>
              {visible.map((col) => {
                const def = byKey.get(col.key);
                if (!def) {
                  return null;
                }
                const className = def.headerClassName
                  ? `${denseDataGrid.th} ${def.headerClassName}`
                  : denseDataGrid.th;
                if (!canEdit) {
                  return (
                    <TableHeaderCell key={col.key} className={className} title={def.headerTitle}>
                      {def.header}
                    </TableHeaderCell>
                  );
                }
                return (
                  <ResizableHeaderCell
                    key={col.key}
                    columnKey={col.key}
                    label={def.label}
                    className={className}
                    title={def.headerTitle}
                    widthPx={widthOf(col.key, col.widthPx)}
                    minWidthPx={col.minWidthPx}
                    maxWidthPx={col.maxWidthPx}
                    onResize={(w) => setDraftWidths((prev) => ({ ...prev, [col.key]: w }))}
                    onResizeEnd={(w) => onResizeEnd(col.key, w)}
                    onReorder={
                      col.reorderable
                        ? (fromKey, toKey) => send(dropMove(visible, fromKey, toKey))
                        : undefined
                    }
                  >
                    {def.header}
                  </ResizableHeaderCell>
                );
              })}
            </TableRow>
            <TableRow className={denseDataGrid.bulkRow}>
              {visible.map((col) => (
                <TableHeaderCell
                  key={col.key}
                  className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}
                >
                  {byKey.get(col.key)?.bulk}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={rowKey(row)} className={denseDataGrid.tr}>
                {visible.map((col) => (
                  <Fragment key={col.key}>{byKey.get(col.key)?.cell(row, idx)}</Fragment>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {footer}
      </Box>
    </>
  );
}

export interface ProductEntryColumnsBarProps {
  /** Every column this mode has; only `key` and `label` are used. */
  columns: Array<Pick<ProductEntryGridColumn<unknown>, 'key' | 'label'>>;
  caption: string;
  /** Grid view: the drawer can also reorder. List view keeps its own field order. */
  allowReorder?: boolean;
}

/**
 * The **Columns** button and drawer for the shop's shared layout. Shown only to owners and admins
 * (`canEdit`); hiding a field here hides it for everyone, in grid and list view.
 */
export function ProductEntryColumnsBar({
  columns,
  caption,
  allowReorder = false,
}: ProductEntryColumnsBarProps) {
  const gridId = GRID_IDS.PRODUCT_ENTRY;
  const layoutQuery = useGridLayoutQuery(gridId);
  const changeMutation = useChangeGridLayoutMutation(gridId);
  const resetMutation = useResetGridLayoutMutation(gridId);
  const [open, setOpen] = useState(false);

  const layout = layoutQuery.data;
  const labels = useMemo(() => new Map(columns.map((c) => [c.key, c.label])), [columns]);
  const laidOut = useMemo(
    () =>
      layoutColumns(
        columns.map((c) => c.key),
        layout,
      ),
    [columns, layout],
  );
  if (layout?.canEdit !== true) {
    return null;
  }
  const send = (change: GridLayoutChange | null) => {
    if (change) {
      changeMutation.mutate(change);
    }
  };
  const error = changeMutation.error ?? resetMutation.error;

  return (
    <>
      <Inline justify="between" gap="sm" mt="sm">
        <Text variant="caption" color="secondary">
          {caption}
        </Text>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon icon={Columns3} size="sm" />
          Columns
        </Button>
      </Inline>
      {error ? <LayoutSaveError error={error} /> : null}
      <ColumnManager
        open={open}
        onClose={() => setOpen(false)}
        description="Changes apply to everyone in this shop, in list and grid view. Columns with a lock are required and cannot be hidden."
        columns={laidOut.map((col) => ({
          key: col.key,
          label: labels.get(col.key) ?? col.key,
          hidden: col.hidden,
          locked: !col.hideable,
          movable: allowReorder && col.reorderable,
        }))}
        onMove={(key, direction) => send(stepMove(laidOut, key, direction))}
        onToggleHidden={(key, hidden) => send({ type: 'SET_HIDDEN', key, hidden })}
        onReset={() => resetMutation.mutate()}
        resetting={resetMutation.isPending}
      />
    </>
  );
}

function LayoutSaveError({ error }: { error: Error }) {
  return (
    <Alert variant="danger">
      {error.message || 'Could not save the column layout. Please try again.'}
    </Alert>
  );
}
