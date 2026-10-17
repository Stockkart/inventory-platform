/** Stable grid ids; mirror the backend `GridIds`. */
export const GRID_IDS = {
  PRODUCT_ENTRY: 'product-entry',
} as const;

export type GridId = (typeof GRID_IDS)[keyof typeof GRID_IDS];

/** One column as laid out by the shop. List order is display order. */
export interface GridColumnState {
  key: string;
  widthPx: number;
  hidden: boolean;
}

export type GridColumnPosition = 'FIRST' | 'ANY' | 'LAST';

/**
 * One column the grid can show. `required` is the field rule (must be filled to save); `hideable`,
 * `reorderable` and `position` are layout rules.
 */
export interface GridColumnDefinition {
  key: string;
  required: boolean;
  hideable: boolean;
  reorderable: boolean;
  position: GridColumnPosition;
  defaultWidthPx: number;
  minWidthPx: number;
  maxWidthPx: number;
}

/** `/shops/active-shop/grid-layouts/{gridId}` response. */
export interface GridLayoutResponse {
  gridId: string;
  isDefault: boolean;
  /** Null while the shop is on the default. */
  revision: number | null;
  /** Owner or admin: may change the shop's layout. */
  canEdit: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  columns: GridColumnState[];
  catalog: GridColumnDefinition[];
}

/** One change, applied by the server to the latest saved layout. */
export type GridLayoutChange =
  | { type: 'RESIZE'; key: string; widthPx: number }
  | { type: 'SET_HIDDEN'; key: string; hidden: boolean }
  /** Place `key` in front of `beforeKey`; null = last movable column. */
  | { type: 'MOVE'; key: string; beforeKey: string | null };
