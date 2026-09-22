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
}
