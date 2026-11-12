export interface CafeKotLine {
  lineId: string;
  name: string;
  quantity: number;
  note?: string | null;
}

/** ISSUE tickets send a round to the kitchen; CANCEL tickets void one already sent. */
export type CafeKotKind = 'ISSUE' | 'CANCEL';

export interface CafeKot {
  kotId: string;
  shopId: string;
  purchaseId: string;
  kotNo: number;
  department: string;
  roundNo: number;
  kind: CafeKotKind;
  lines: CafeKotLine[];
  /** How many times this ticket has been reprinted. Absent on a ticket just punched. */
  reprintCount?: number | null;
  /** ISO instant the ticket was written. Absent on tickets issued before this was recorded. */
  createdAt?: string | null;
}
