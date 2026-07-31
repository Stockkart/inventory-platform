// Accounting module --------------------------------------------------------

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export type AccountingPartyType = 'CUSTOMER' | 'VENDOR' | 'SHOP';

export type JournalSource =
  | 'OPENING_BALANCE'
  | 'VENDOR_PURCHASE_INVOICE'
  | 'VENDOR_PURCHASE_RETURN'
  | 'SALE'
  | 'SALES_RETURN'
  | 'CUSTOMER_SETTLEMENT'
  | 'VENDOR_PAYMENT'
  | 'INVENTORY_CORRECTION'
  | 'MANUAL'
  | 'REVERSAL';

export type JournalStatus = 'POSTED' | 'REVERSED' | 'VOID';

export interface AccountResponse {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentCode?: string | null;
  system: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
  normalBalance?: NormalBalance;
}

export interface UpdateAccountRequest {
  name?: string;
  active?: boolean;
}

export interface JournalLineResponse {
  lineIndex: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  partyType?: AccountingPartyType | null;
  partyRefId?: string | null;
  partyDisplayName?: string | null;
  memo?: string | null;
}

export interface JournalEntryResponse {
  id: string;
  entryNo: string;
  txnDate: string;
  postedAt: string;
  sourceType: JournalSource;
  sourceId?: string | null;
  status: JournalStatus;
  reversesEntryId?: string | null;
  reversedByEntryId?: string | null;
  narration?: string | null;
  lines: JournalLineResponse[];
  totalDebit: number;
  totalCredit: number;
  createdByUserId?: string | null;
}

export interface JournalEntriesPageResponse {
  entries: JournalEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateJournalLineRequest {
  accountCode?: string;
  accountId?: string;
  debit?: number;
  credit?: number;
  partyType?: AccountingPartyType;
  partyRefId?: string;
  partyDisplayName?: string;
  memo?: string;
}

export interface CreateJournalEntryRequest {
  txnDate?: string;
  narration?: string;
  lines: CreateJournalLineRequest[];
}

export interface ReverseJournalRequest {
  reason?: string;
}

export interface LedgerEntryResponse {
  id: string;
  journalEntryId: string;
  journalEntryNo: string;
  sourceType: JournalSource;
  sourceId?: string | null;
  txnDate: string;
  postedAt: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  partyType?: AccountingPartyType | null;
  partyRefId?: string | null;
  partyDisplayName?: string | null;
  narration?: string | null;
}

export interface LedgerPageResponse {
  account: AccountResponse;
  entries: LedgerEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  debitTurnover: number;
  creditTurnover: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceResponse {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface BackfillResult {
  processed: number;
  posted: number;
  /** Re-posted invoices (only non-zero when force=true was passed). */
  reposted: number;
  skipped: number;
  failed: number;
}

export interface FinancialReportLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  amount: number;
}

export interface ProfitAndLossResponse {
  from: string;
  to: string;
  revenueLines: FinancialReportLineDto[];
  expenseLines: FinancialReportLineDto[];
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}

export interface BalanceSheetResponse {
  asOf: string;
  assets: FinancialReportLineDto[];
  liabilities: FinancialReportLineDto[];
  equity: FinancialReportLineDto[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  imbalance: number;
}

export interface OpeningBalanceRequest {
  txnDate?: string;
  narration?: string;
  lines: CreateJournalLineRequest[];
}

export interface PartySummaryRow {
  partyType: AccountingPartyType;
  partyRefId: string;
  partyDisplayName: string | null;
  debitTurnover: number;
  creditTurnover: number;
  /** Positive = we owe vendor (VENDOR) / customer owes us (CUSTOMER). */
  balance: number;
  lastTxnDate: string | null;
  txnCount: number;
}

export interface PartySummariesResponse {
  partyType: AccountingPartyType;
  from: string | null;
  to: string | null;
  asOf: string;
  parties: PartySummaryRow[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

export interface PartyStatementEntryResponse {
  id: string;
  journalEntryId: string;
  journalEntryNo: string;
  sourceType: JournalSource;
  sourceId: string | null;
  txnDate: string;
  postedAt: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  /** Party-oriented running balance after this entry. */
  balanceAfter: number;
  narration: string | null;
}

export interface PartyStatementResponse {
  partyType: AccountingPartyType;
  partyRefId: string;
  partyDisplayName: string | null;
  openingBalance: number;
  closingBalance: number;
  entries: PartyStatementEntryResponse[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Vendor money MIS. */
export type VendorMoneyMisTxnType =
  | 'VENDOR_PURCHASE'
  | 'VENDOR_PAYMENT'
  | 'VENDOR_RETURN'
  | 'VENDOR_CREDIT_CHARGE';

export type VendorMoneyMisMoneyFilter =
  | 'ALL'
  | 'HAS_CASH'
  | 'HAS_ONLINE'
  | 'HAS_CREDIT'
  | 'FULLY_PAID'
  | 'MIXED';

export interface VendorMoneyMisRow {
  txnId: string;
  txnType: VendorMoneyMisTxnType | string;
  txnTypeLabel: string;
  vendorId: string;
  vendorName: string;
  txnDate: string;
  postedAt: string | null;
  refNo: string | null;
  againstTxnId: string | null;
  againstRefNo: string | null;
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
  balanceAfter: number;
  sourceType: string | null;
  sourceId: string | null;
  opening: boolean;
}

export interface VendorMoneyMisVendorSummary {
  vendorId: string;
  vendorName: string;
  openingBalance: number;
  closingBalanceInPeriod: number;
  currentBalance: number;
}

export interface VendorMoneyMisSummary {
  openingBalanceTotal: number;
  periodCashTotal: number;
  periodOnlineTotal: number;
  periodCreditTotal: number;
  periodPurchaseTotal: number;
  currentPayableTotal: number;
  vendorSummaries: VendorMoneyMisVendorSummary[];
}

export interface VendorMoneyMisResponse {
  from: string;
  to: string;
  rows: VendorMoneyMisRow[];
  summary: VendorMoneyMisSummary;
}

export interface VendorMoneyMisParams {
  from?: string;
  to?: string;
  vendorId?: string;
  /** Comma-separated txn types, or an array joined by the API client. */
  txnTypes?: string | VendorMoneyMisTxnType[];
  moneyFilter?: VendorMoneyMisMoneyFilter;
  q?: string;
}
