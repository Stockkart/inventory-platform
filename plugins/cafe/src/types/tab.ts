/**
 * A tab holds only what has **not** yet been sent to the kitchen — there is no delta
 * anywhere. Printing (flush) claims the tab's lines, sends one ticket per kitchen
 * station, appends the lines to a chosen bill, and empties the tab, which keeps its
 * token for the next round.
 *
 * See docs/superpowers/specs/2026-09-21-cafe-kot-tabs-design.md ("The two surfaces").
 */
export interface CafeTabLine {
  /**
   * The line's own address — a server-generated id, distinct from `sellableRef`, used by
   * `DELETE /cafe/tabs/{tabId}/lines/{lineRef}`. Kept distinct because a later menu edit
   * must never retarget a line already composed.
   */
  lineRef: string;
  sellableRef: string;
  name: string;
  quantity: number;
  note?: string | null;
  department: string;
}

/** Ends only by explicit close — no expiry, no rollover, no eviction. */
export type CafeTabStatus = 'OPEN' | 'CLOSED';

export interface CafeTab {
  id: string;
  /** Allocated from the daily per-shop token counter; carried as a string, like a bill's token. */
  tokenNo: string;
  status: CafeTabStatus;
  lines: CafeTabLine[];
}

/**
 * Body for POST /cafe/tabs/{tabId}/lines. Omitting `lineRef` adds a new line for
 * `sellableRef`; supplying an existing line's `lineRef` updates its quantity and/or note
 * instead (the frozen `department` never changes).
 */
export interface CafeTabLineInput {
  lineRef?: string;
  sellableRef?: string;
  quantity: number;
  note?: string | null;
}

/**
 * Names the bill a flush should append its tickets' lines to. `purchaseId: null` asks
 * the server to open a new bill.
 */
export interface CafeFlushTarget {
  purchaseId: string | null;
}
