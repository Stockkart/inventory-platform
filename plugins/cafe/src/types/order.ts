export interface CafeOrderLine {
  lineId: string;
  sellableRef: string;
  name: string;
  quantity: number;
  note?: string | null;
  department?: string | null;
  kotId?: string | null;
  status: 'ACTIVE' | 'VOIDED';
}

export interface CafeOrder {
  orderId: string;
  shopId: string;
  orderNo: number;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableLabel?: string | null;
  tokenNo?: string | null;
  status: 'OPEN' | 'BILLED' | 'CANCELLED';
  purchaseId?: string | null;
  businessDate: string;
  roundsPunched: number;
  lines: CafeOrderLine[];
}

export interface CafeKotLine {
  lineId: string;
  name: string;
  quantity: number;
  note?: string | null;
}

export interface CafeKot {
  kotId: string;
  shopId: string;
  orderId: string;
  kotNo: number;
  department: string;
  roundNo: number;
  status: 'ISSUED' | 'VOIDED';
  voidReason?: string | null;
  reprintCount: number;
  businessDate: string;
  lines: CafeKotLine[];
}

export interface OpenOrderBody {
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableLabel?: string;
}

export interface PunchBody {
  lines: Array<{ sellableRef: string; quantity: number; note?: string }>;
}
