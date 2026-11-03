import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ColumnManager, GridColGroup, ResizableHeaderCell } from './GridColumns';
import type { ColumnManagerItem } from './GridColumns';
import { DenseDataGridWrap, denseDataGrid } from './DenseDataGrid';
import { Table, TableBody, TableCell, TableHead, TableRow } from '../data-display/Table';
import { Button } from '../forms';
import { Stack, Text } from '../layout';

const meta: Meta = {
  title: 'Patterns/Grid columns',
};

export default meta;

type Col = ColumnManagerItem & { widthPx: number };

const initial: Col[] = [
  { key: 'rowNo', label: '#', widthPx: 48, hidden: false, locked: true, movable: false },
  { key: 'barcode', label: 'Barcode', widthPx: 200, hidden: false, locked: false, movable: true },
  { key: 'product', label: 'Product', widthPx: 240, hidden: false, locked: true, movable: true },
  { key: 'qty', label: 'Qty', widthPx: 80, hidden: false, locked: true, movable: true },
  {
    key: 'packaging',
    label: 'Packaging',
    widthPx: 210,
    hidden: false,
    locked: false,
    movable: true,
  },
  { key: 'actions', label: 'Actions', widthPx: 120, hidden: false, locked: true, movable: false },
];

const rows = [
  { barcode: '8901234567890', product: 'Paracetamol 500mg', qty: '20', packaging: 'Strip 1x15' },
  { barcode: '', product: 'Pantoprazole 40mg', qty: '10', packaging: 'Strip 1x10' },
];

function moveBefore(cols: Col[], fromKey: string, toKey: string): Col[] {
  const next = cols.filter((c) => c.key !== fromKey);
  const moving = cols.find((c) => c.key === fromKey);
  const at = next.findIndex((c) => c.key === toKey);
  if (!moving || at < 0) {
    return cols;
  }
  next.splice(at, 0, moving);
  return next;
}

function Demo() {
  const [cols, setCols] = useState(initial);
  const [open, setOpen] = useState(false);
  const visible = cols.filter((c) => !c.hidden);
  const setWidth = (key: string, widthPx: number) =>
    setCols((prev) => prev.map((c) => (c.key === key ? { ...c, widthPx } : c)));

  return (
    <Stack gap="md">
      <Text variant="title">Resizable, reorderable dense grid</Text>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Columns
      </Button>
      <DenseDataGridWrap>
        <Table
          className={`${denseDataGrid.table} ${denseDataGrid.tableFixed}`}
          style={{ width: `${visible.reduce((s, c) => s + c.widthPx, 0)}px` }}
        >
          <GridColGroup widths={visible.map((c) => c.widthPx)} />
          <TableHead>
            <TableRow>
              {visible.map((c) => (
                <ResizableHeaderCell
                  key={c.key}
                  columnKey={c.key}
                  label={c.label}
                  className={denseDataGrid.th}
                  widthPx={c.widthPx}
                  minWidthPx={48}
                  maxWidthPx={600}
                  onResize={(w) => setWidth(c.key, w)}
                  onResizeEnd={(w) => setWidth(c.key, w)}
                  onReorder={
                    c.movable
                      ? (from, to) => setCols((prev) => moveBefore(prev, from, to))
                      : undefined
                  }
                >
                  {c.label}
                </ResizableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx} className={denseDataGrid.tr}>
                {visible.map((c) => (
                  <TableCell key={c.key} className={denseDataGrid.td}>
                    {c.key === 'rowNo'
                      ? idx + 1
                      : c.key === 'actions'
                      ? '—'
                      : r[c.key as keyof typeof r]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DenseDataGridWrap>
      <ColumnManager
        open={open}
        onClose={() => setOpen(false)}
        description="Changes apply to everyone in this shop."
        columns={cols}
        onMove={(key, direction) =>
          setCols((prev) => {
            const movable = prev.filter((c) => c.movable);
            const pos = movable.findIndex((c) => c.key === key);
            const target = movable[pos + direction];
            if (!target) {
              return prev;
            }
            return direction === -1
              ? moveBefore(prev, key, target.key)
              : moveBefore(prev, target.key, key);
          })
        }
        onToggleHidden={(key, hidden) =>
          setCols((prev) => prev.map((c) => (c.key === key ? { ...c, hidden } : c)))
        }
        onReset={() => setCols(initial)}
      />
    </Stack>
  );
}

export const ResizeReorderHide: StoryObj = {
  render: () => <Demo />,
};
