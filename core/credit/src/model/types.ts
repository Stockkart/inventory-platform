export type CreditPartyType = 'VENDOR' | 'CUSTOMER';
export type CreditEntryType = 'CHARGE' | 'SETTLEMENT' | 'RETURN' | 'ADJUSTMENT';
export type CreditDirection = 'INCREASE_DUE' | 'DECREASE_DUE';
export type CreditBalanceStatus = 'CLEAR' | 'DUE' | 'ADVANCE';

export interface CreditAccountResponse {
  id: string;
  partyType: CreditPartyType;
  partyId: string;
  partyDisplayName: string;
  partyPhone?: string | null;
  currentBalance: number;
  status: CreditBalanceStatus;
  updatedAt?: string;
  lastEntryAt?: string;
}

export interface CreditEntryResponse {
  id: string;
  accountId: string;
  entryType: CreditEntryType;
  direction: CreditDirection;
  amount: number;
  balanceAfter: number;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  sourceKey?: string | null;
  paymentMethod?: string | null;
  bankRef?: string | null;
  txnDate?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
}

export interface CreditEntriesPageResponse {
  entries: CreditEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Tender used when posting a settlement (required on settlement API). */
export type CreditSettlementPaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'ADJUSTMENT';

export interface CreateCreditEntryDto {
  partyType: CreditPartyType;
  partyId: string;
  partyDisplayName: string;
  partyPhone?: string;
  amount: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  sourceKey?: string;
  /** Required for {@code POST /credit/settlement}. */
  paymentMethod?: CreditSettlementPaymentMethod;
  bankRef?: string;
  /** Business date (yyyy-mm-dd); defaults to today on the server. */
  txnDate?: string;
}
