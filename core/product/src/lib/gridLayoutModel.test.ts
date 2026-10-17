import type { GridColumnDefinition, GridLayoutResponse } from '../model/gridLayout.types';
import { applyGridLayoutChange, dropMove, layoutColumns, stepMove } from './gridLayoutModel';

const def = (key: string, overrides: Partial<GridColumnDefinition> = {}): GridColumnDefinition => ({
  key,
  required: false,
  hideable: true,
  reorderable: true,
  position: 'ANY',
  defaultWidthPx: 100,
  minWidthPx: 48,
  maxWidthPx: 600,
  ...overrides,
});

const layout: GridLayoutResponse = {
  gridId: 'product-entry',
  isDefault: false,
  revision: 3,
  canEdit: true,
  updatedAt: null,
  updatedByUserId: null,
  catalog: [
    def('rowNo', { hideable: false, reorderable: false, position: 'FIRST' }),
    def('barcode'),
    def('product', { required: true, hideable: false }),
    def('qty', { required: true, hideable: false }),
    def('hsn'),
    def('actions', { hideable: false, reorderable: false, position: 'LAST' }),
  ],
  columns: [
    { key: 'rowNo', widthPx: 48, hidden: false },
    { key: 'product', widthPx: 300, hidden: false },
    { key: 'barcode', widthPx: 200, hidden: true },
    { key: 'qty', widthPx: 80, hidden: false },
    { key: 'hsn', widthPx: 110, hidden: false },
    { key: 'actions', widthPx: 140, hidden: false },
  ],
};

describe('layoutColumns', () => {
  it('applies the shop order and widths to the columns this mode has', () => {
    const cols = layoutColumns(['rowNo', 'barcode', 'product', 'qty', 'actions'], layout);
    expect(cols.map((c) => c.key)).toEqual(['rowNo', 'product', 'barcode', 'qty', 'actions']);
    expect(cols.find((c) => c.key === 'product')?.widthPx).toBe(300);
    expect(cols.find((c) => c.key === 'barcode')?.hidden).toBe(true);
  });

  it('places a column the server does not know after its frontend neighbour, shown', () => {
    const cols = layoutColumns(['rowNo', 'product', 'newCol', 'qty', 'actions'], layout);
    expect(cols.map((c) => c.key)).toEqual(['rowNo', 'product', 'newCol', 'qty', 'actions']);
    expect(cols.find((c) => c.key === 'newCol')).toMatchObject({ hidden: false, hideable: false });
  });

  it('keeps the code order while the layout is loading', () => {
    expect(layoutColumns(['rowNo', 'qty'], undefined).map((c) => c.key)).toEqual(['rowNo', 'qty']);
  });
});

describe('applyGridLayoutChange', () => {
  it('resizes, hides and moves like the server', () => {
    expect(
      applyGridLayoutChange(layout, { type: 'RESIZE', key: 'qty', widthPx: 90 }).columns[3],
    ).toEqual({ key: 'qty', widthPx: 90, hidden: false });
    expect(
      applyGridLayoutChange(layout, { type: 'SET_HIDDEN', key: 'hsn', hidden: true }).columns[4]
        .hidden,
    ).toBe(true);
    expect(
      applyGridLayoutChange(layout, { type: 'MOVE', key: 'hsn', beforeKey: 'product' }).columns.map(
        (c) => c.key,
      ),
    ).toEqual(['rowNo', 'hsn', 'product', 'barcode', 'qty', 'actions']);
    expect(
      applyGridLayoutChange(layout, { type: 'MOVE', key: 'product', beforeKey: null }).columns.map(
        (c) => c.key,
      ),
    ).toEqual(['rowNo', 'barcode', 'qty', 'hsn', 'product', 'actions']);
  });
});

describe('moves', () => {
  const visible = layoutColumns(['rowNo', 'product', 'qty', 'hsn', 'actions'], layout);

  it('steps one place among movable columns', () => {
    expect(stepMove(visible, 'qty', -1)).toEqual({
      type: 'MOVE',
      key: 'qty',
      beforeKey: 'product',
    });
    expect(stepMove(visible, 'qty', 1)).toEqual({ type: 'MOVE', key: 'qty', beforeKey: null });
    expect(stepMove(visible, 'product', -1)).toBeNull();
    expect(stepMove(visible, 'hsn', 1)).toBeNull();
  });

  it('drops a header in front of a left target and after a right target', () => {
    expect(dropMove(visible, 'hsn', 'product')).toEqual({
      type: 'MOVE',
      key: 'hsn',
      beforeKey: 'product',
    });
    expect(dropMove(visible, 'product', 'qty')).toEqual({
      type: 'MOVE',
      key: 'product',
      beforeKey: 'hsn',
    });
    expect(dropMove(visible, 'product', 'actions')).toBeNull();
    expect(dropMove(visible, 'rowNo', 'qty')).toBeNull();
  });
});
