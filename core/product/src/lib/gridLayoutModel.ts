import type {
  GridColumnDefinition,
  GridColumnState,
  GridLayoutChange,
  GridLayoutResponse,
} from '../model/gridLayout.types';

/** Width when neither the shop layout nor the catalog knows a column (layout still loading). */
const FALLBACK_WIDTH_PX = 120;

export interface GridColumnLayout {
  key: string;
  widthPx: number;
  hidden: boolean;
  minWidthPx: number;
  maxWidthPx: number;
  hideable: boolean;
  reorderable: boolean;
}

/**
 * The shop layout applied to the columns this billing mode actually has, in display order.
 * Columns the server does not know (it lags a frontend release) keep their place and stay shown.
 * Pure; exported for tests.
 */
export function layoutColumns(
  availableKeys: string[],
  layout: GridLayoutResponse | undefined,
): GridColumnLayout[] {
  const available = new Set(availableKeys);
  if (!layout) {
    return availableKeys.map((key) => fallback(key));
  }
  const catalog = new Map(layout.catalog.map((c) => [c.key, c]));
  const ordered: GridColumnLayout[] = [];
  for (const state of layout.columns) {
    const def = catalog.get(state.key);
    if (def && available.has(state.key)) {
      ordered.push(fromState(state, def));
    }
  }
  const placed = new Set(ordered.map((c) => c.key));
  availableKeys.forEach((key, idx) => {
    if (placed.has(key)) {
      return;
    }
    const prev = availableKeys
      .slice(0, idx)
      .reverse()
      .find((k) => placed.has(k));
    const at = prev ? ordered.findIndex((c) => c.key === prev) + 1 : 0;
    ordered.splice(at, 0, fallback(key));
    placed.add(key);
  });
  return ordered;
}

/**
 * The server's rule for one change, run on the cached layout so the grid moves at once; the
 * server's response replaces it. Pure; exported for tests.
 */
export function applyGridLayoutChange(
  layout: GridLayoutResponse,
  change: GridLayoutChange,
): GridLayoutResponse {
  const columns = layout.columns.slice();
  const idx = columns.findIndex((c) => c.key === change.key);
  if (idx < 0) {
    return layout;
  }
  if (change.type === 'RESIZE') {
    columns[idx] = { ...columns[idx], widthPx: change.widthPx };
  } else if (change.type === 'SET_HIDDEN') {
    columns[idx] = { ...columns[idx], hidden: change.hidden };
  } else {
    const [moving] = columns.splice(idx, 1);
    const positions = new Map(layout.catalog.map((c) => [c.key, c.position]));
    let at = columns.findIndex((c) =>
      change.beforeKey === null ? positions.get(c.key) === 'LAST' : c.key === change.beforeKey,
    );
    if (at < 0) {
      at = columns.length;
    }
    columns.splice(at, 0, moving);
  }
  return { ...layout, isDefault: false, columns };
}

/**
 * The MOVE that puts `key` one step left or right among the reorderable columns the user can see
 * in this mode. Returns null at either end.
 */
export function stepMove(
  visible: GridColumnLayout[],
  key: string,
  direction: -1 | 1,
): GridLayoutChange | null {
  const movable = visible.filter((c) => c.reorderable);
  const pos = movable.findIndex((c) => c.key === key);
  const target = pos + direction;
  if (pos < 0 || target < 0 || target >= movable.length) {
    return null;
  }
  if (direction === -1) {
    return { type: 'MOVE', key, beforeKey: movable[target].key };
  }
  const after = movable[target + 1];
  return { type: 'MOVE', key, beforeKey: after ? after.key : null };
}

/** The MOVE for dropping header `fromKey` onto header `toKey`. */
export function dropMove(
  visible: GridColumnLayout[],
  fromKey: string,
  toKey: string,
): GridLayoutChange | null {
  const from = visible.findIndex((c) => c.key === fromKey);
  const to = visible.findIndex((c) => c.key === toKey);
  if (from < 0 || to < 0 || from === to || !visible[from].reorderable || !visible[to].reorderable) {
    return null;
  }
  if (to < from) {
    return { type: 'MOVE', key: fromKey, beforeKey: toKey };
  }
  const after = visible.slice(to + 1).find((c) => c.reorderable);
  return { type: 'MOVE', key: fromKey, beforeKey: after ? after.key : null };
}

function fromState(state: GridColumnState, def: GridColumnDefinition): GridColumnLayout {
  return {
    key: state.key,
    widthPx: state.widthPx,
    hidden: state.hidden && def.hideable,
    minWidthPx: def.minWidthPx,
    maxWidthPx: def.maxWidthPx,
    hideable: def.hideable,
    reorderable: def.reorderable,
  };
}

function fallback(key: string): GridColumnLayout {
  return {
    key,
    widthPx: FALLBACK_WIDTH_PX,
    hidden: false,
    minWidthPx: 48,
    maxWidthPx: 600,
    hideable: false,
    reorderable: false,
  };
}
