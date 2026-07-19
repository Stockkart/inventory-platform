import { apiClient } from '@inventory-platform/api-client';
import type {
  AccountResponse,
  AccountingPartyType,
  BackfillResult,
  CreateAccountRequest,
  BalanceSheetResponse,
  CreateJournalEntryRequest,
  JournalEntriesPageResponse,
  JournalEntryResponse,
  JournalSource,
  LedgerPageResponse,
  OpeningBalanceRequest,
  SalesMisParams,
  SalesMisResponse,
  VendorMoneyMisParams,
  VendorMoneyMisResponse,
  PartyStatementResponse,
  PartySummariesResponse,
  ProfitAndLossResponse,
  ReverseJournalRequest,
  TrialBalanceResponse,
  UpdateAccountRequest,
} from '@inventory-platform/accounting/types';
import { ACCOUNTING_ENDPOINTS } from './endpoints';
import { downloadAccountingBlob } from './download';

function unwrap<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return raw as T;
  const o = raw as Record<string, unknown>;
  // ApiResponse uses NON_NULL — null `data` is omitted, so `{ success: true }` means no payload.
  if ('success' in o) {
    if ('data' in o) return o.data as T;
    return undefined;
  }
  return raw as T;
}

function asNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return 0;
}

function normalizeAccount(a: AccountResponse): AccountResponse {
  return { ...a };
}

function normalizeJournalEntry(e: JournalEntryResponse): JournalEntryResponse {
  return {
    ...e,
    totalDebit: asNum(e.totalDebit),
    totalCredit: asNum(e.totalCredit),
    lines: (e.lines ?? []).map((l) => ({
      ...l,
      debit: asNum(l.debit),
      credit: asNum(l.credit),
    })),
  };
}

function normalizeLedgerPage(page: LedgerPageResponse): LedgerPageResponse {
  return {
    ...page,
    account: page.account ? normalizeAccount(page.account) : page.account,
    entries: (page.entries ?? []).map((row) => ({
      ...row,
      debit: asNum(row.debit),
      credit: asNum(row.credit),
      balanceAfter: asNum(row.balanceAfter),
    })),
  };
}

function normalizeFinancialLines(
  lines: ProfitAndLossResponse['revenueLines'] | undefined,
): ProfitAndLossResponse['revenueLines'] {
  return (lines ?? []).map((l) => ({ ...l, amount: asNum(l.amount) }));
}

function normalizeProfitAndLoss(pl: ProfitAndLossResponse): ProfitAndLossResponse {
  return {
    ...pl,
    totalRevenue: asNum(pl.totalRevenue),
    totalExpense: asNum(pl.totalExpense),
    netProfit: asNum(pl.netProfit),
    revenueLines: normalizeFinancialLines(pl.revenueLines),
    expenseLines: normalizeFinancialLines(pl.expenseLines),
  };
}

function normalizeBalanceSheet(bs: BalanceSheetResponse): BalanceSheetResponse {
  return {
    ...bs,
    totalAssets: asNum(bs.totalAssets),
    totalLiabilities: asNum(bs.totalLiabilities),
    totalEquity: asNum(bs.totalEquity),
    totalLiabilitiesAndEquity: asNum(bs.totalLiabilitiesAndEquity),
    imbalance: asNum(bs.imbalance),
    assets: normalizeFinancialLines(bs.assets),
    liabilities: normalizeFinancialLines(bs.liabilities),
    equity: normalizeFinancialLines(bs.equity),
  };
}

function normalizeTrialBalance(tb: TrialBalanceResponse): TrialBalanceResponse {
  return {
    ...tb,
    totalDebit: asNum(tb.totalDebit),
    totalCredit: asNum(tb.totalCredit),
    rows: (tb.rows ?? []).map((r) => ({
      ...r,
      debitTurnover: asNum(r.debitTurnover),
      creditTurnover: asNum(r.creditTurnover),
      debitBalance: asNum(r.debitBalance),
      creditBalance: asNum(r.creditBalance),
    })),
  };
}

function normalizeParties(s: PartySummariesResponse): PartySummariesResponse {
  return {
    ...s,
    totalDebit: asNum(s.totalDebit),
    totalCredit: asNum(s.totalCredit),
    totalBalance: asNum(s.totalBalance),
    parties: (s.parties ?? []).map((p) => ({
      ...p,
      debitTurnover: asNum(p.debitTurnover),
      creditTurnover: asNum(p.creditTurnover),
      balance: asNum(p.balance),
    })),
  };
}

function normalizePartyStatement(st: PartyStatementResponse): PartyStatementResponse {
  return {
    ...st,
    openingBalance: asNum(st.openingBalance),
    closingBalance: asNum(st.closingBalance),
    entries: (st.entries ?? []).map((e) => ({
      ...e,
      debit: asNum(e.debit),
      credit: asNum(e.credit),
      balanceAfter: asNum(e.balanceAfter),
    })),
  };
}

function normalizeVendorMoneyMis(res: VendorMoneyMisResponse): VendorMoneyMisResponse {
  const summary = res.summary;
  return {
    ...res,
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      totalAmount: asNum(r.totalAmount),
      cashAmount: asNum(r.cashAmount),
      onlineAmount: asNum(r.onlineAmount),
      creditAmount: asNum(r.creditAmount),
      balanceAfter: asNum(r.balanceAfter),
      opening: Boolean(r.opening),
    })),
    summary: {
      openingBalanceTotal: asNum(summary?.openingBalanceTotal),
      periodCashTotal: asNum(summary?.periodCashTotal),
      periodOnlineTotal: asNum(summary?.periodOnlineTotal),
      periodCreditTotal: asNum(summary?.periodCreditTotal),
      periodPurchaseTotal: asNum(summary?.periodPurchaseTotal),
      currentPayableTotal: asNum(summary?.currentPayableTotal),
      vendorSummaries: (summary?.vendorSummaries ?? []).map((p) => ({
        ...p,
        openingBalance: asNum(p.openingBalance),
        closingBalanceInPeriod: asNum(p.closingBalanceInPeriod),
        currentBalance: asNum(p.currentBalance),
      })),
    },
  };
}

function vendorMoneyMisQuery(params: VendorMoneyMisParams): Record<string, string> {
  const txnTypes = Array.isArray(params.txnTypes) ? params.txnTypes.join(',') : params.txnTypes;
  return toQuery({
    from: params.from,
    to: params.to,
    vendorId: params.vendorId,
    txnTypes,
    moneyFilter: params.moneyFilter,
    q: params.q,
  });
}

function salesMisQuery(params: SalesMisParams): Record<string, string> {
  const txnTypes = Array.isArray(params.txnTypes) ? params.txnTypes.join(',') : params.txnTypes;
  return toQuery({
    from: params.from,
    to: params.to,
    customerId: params.customerId,
    txnTypes,
    moneyFilter: params.moneyFilter,
    q: params.q,
  });
}

export interface JournalListParams {
  sourceType?: JournalSource;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface LedgerParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface PartiesListParams {
  type: AccountingPartyType;
  from?: string;
  to?: string;
}

export interface PartyStatementParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

function toQuery(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    out[k] = String(v);
  });
  return out;
}

function toQs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const accountingApi = {
  accounts: async (): Promise<AccountResponse[]> => {
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.ACCOUNTS);
    const inner = unwrap<AccountResponse[]>(raw);
    return Array.isArray(inner) ? inner.map(normalizeAccount) : [];
  },

  createAccount: async (body: CreateAccountRequest): Promise<AccountResponse> => {
    const raw = await apiClient.post<unknown>(ACCOUNTING_ENDPOINTS.ACCOUNTS, body);
    const inner = unwrap<AccountResponse>(raw);
    if (!inner) throw new Error('Invalid response creating account');
    return normalizeAccount(inner);
  },

  updateAccount: async (id: string, body: UpdateAccountRequest): Promise<AccountResponse> => {
    const raw = await apiClient.patch<unknown>(ACCOUNTING_ENDPOINTS.ACCOUNT_BY_ID(id), body);
    const inner = unwrap<AccountResponse>(raw);
    if (!inner) throw new Error('Invalid response updating account');
    return normalizeAccount(inner);
  },

  journals: async (params: JournalListParams = {}): Promise<JournalEntriesPageResponse> => {
    const raw = await apiClient.get<unknown>(
      ACCOUNTING_ENDPOINTS.JOURNAL,
      toQuery({
        sourceType: params.sourceType,
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),
    );
    const inner = unwrap<JournalEntriesPageResponse>(raw);
    if (!inner || !Array.isArray(inner.entries)) {
      return { entries: [], page: 0, size: params.size ?? 20, totalItems: 0, totalPages: 0 };
    }
    return { ...inner, entries: inner.entries.map(normalizeJournalEntry) };
  },

  journal: async (id: string): Promise<JournalEntryResponse> => {
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.JOURNAL_BY_ID(id));
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Journal entry not found');
    return normalizeJournalEntry(inner);
  },

  createManualJournal: async (body: CreateJournalEntryRequest): Promise<JournalEntryResponse> => {
    const raw = await apiClient.post<unknown>(ACCOUNTING_ENDPOINTS.JOURNAL, body);
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Invalid response posting manual journal');
    return normalizeJournalEntry(inner);
  },

  reverseJournal: async (
    id: string,
    body: ReverseJournalRequest = {},
  ): Promise<JournalEntryResponse> => {
    const raw = await apiClient.post<unknown>(ACCOUNTING_ENDPOINTS.JOURNAL_REVERSE(id), body);
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Invalid response reversing journal');
    return normalizeJournalEntry(inner);
  },

  ledger: async (accountId: string, params: LedgerParams = {}): Promise<LedgerPageResponse> => {
    const raw = await apiClient.get<unknown>(
      ACCOUNTING_ENDPOINTS.LEDGER(accountId),
      toQuery({
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 50,
      }),
    );
    const inner = unwrap<LedgerPageResponse>(raw);
    if (!inner) {
      throw new Error('Account ledger not found');
    }
    return normalizeLedgerPage(inner);
  },

  parties: async (params: PartiesListParams): Promise<PartySummariesResponse> => {
    const raw = await apiClient.get<unknown>(
      ACCOUNTING_ENDPOINTS.PARTIES,
      toQuery({ type: params.type, from: params.from, to: params.to }),
    );
    const inner = unwrap<PartySummariesResponse>(raw);
    if (!inner) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        partyType: params.type,
        from: params.from ?? null,
        to: params.to ?? null,
        asOf: today,
        parties: [],
        totalDebit: 0,
        totalCredit: 0,
        totalBalance: 0,
      };
    }
    return normalizeParties(inner);
  },

  partyStatement: async (
    type: AccountingPartyType,
    partyRefId: string,
    params: PartyStatementParams = {},
  ): Promise<PartyStatementResponse> => {
    const raw = await apiClient.get<unknown>(
      ACCOUNTING_ENDPOINTS.PARTY_STATEMENT(type, encodeURIComponent(partyRefId)),
      toQuery({
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 50,
      }),
    );
    const inner = unwrap<PartyStatementResponse>(raw);
    if (!inner) {
      return {
        partyType: type,
        partyRefId,
        partyDisplayName: null,
        openingBalance: 0,
        closingBalance: 0,
        entries: [],
        page: 0,
        size: params.size ?? 50,
        totalItems: 0,
        totalPages: 0,
      };
    }
    return normalizePartyStatement(inner);
  },

  trialBalance: async (asOf?: string): Promise<TrialBalanceResponse> => {
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.TRIAL_BALANCE, toQuery({ asOf }));
    const inner = unwrap<TrialBalanceResponse>(raw);
    if (!inner) {
      const today = (asOf ?? new Date().toISOString().slice(0, 10)) as string;
      return { asOf: today, rows: [], totalDebit: 0, totalCredit: 0 };
    }
    return normalizeTrialBalance(inner);
  },

  profitAndLoss: async (from: string, to: string): Promise<ProfitAndLossResponse> => {
    const raw = await apiClient.get<unknown>(
      ACCOUNTING_ENDPOINTS.PROFIT_AND_LOSS,
      toQuery({ from, to }),
    );
    const inner = unwrap<ProfitAndLossResponse>(raw);
    if (!inner) {
      return {
        from,
        to,
        revenueLines: [],
        expenseLines: [],
        totalRevenue: 0,
        totalExpense: 0,
        netProfit: 0,
      };
    }
    return normalizeProfitAndLoss(inner);
  },

  balanceSheet: async (asOf?: string): Promise<BalanceSheetResponse> => {
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.BALANCE_SHEET, toQuery({ asOf }));
    const inner = unwrap<BalanceSheetResponse>(raw);
    if (!inner) {
      const today = (asOf ?? new Date().toISOString().slice(0, 10)) as string;
      return {
        asOf: today,
        assets: [],
        liabilities: [],
        equity: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalLiabilitiesAndEquity: 0,
        imbalance: 0,
      };
    }
    return normalizeBalanceSheet(inner);
  },

  postOpeningBalance: async (body: OpeningBalanceRequest): Promise<JournalEntryResponse> => {
    const raw = await apiClient.post<unknown>(ACCOUNTING_ENDPOINTS.OPENING_BALANCES, body);
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Invalid response posting opening balances');
    return normalizeJournalEntry(inner);
  },

  openingBalanceStatus: async (): Promise<JournalEntryResponse | null> => {
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.OPENING_BALANCES_STATUS);
    const inner = unwrap<JournalEntryResponse | null>(raw);
    if (!inner || typeof inner !== 'object' || !inner.id) return null;
    return normalizeJournalEntry(inner);
  },

  backfill: async (
    options: { from?: string; to?: string; force?: boolean } = {},
  ): Promise<BackfillResult> => {
    const raw = await apiClient.post<unknown>(
      `${ACCOUNTING_ENDPOINTS.BACKFILL}${toQs({
        from: options.from,
        to: options.to,
        force: options.force ? 'true' : undefined,
      })}`,
      {},
    );
    const inner = unwrap<BackfillResult>(raw);
    return inner ?? { processed: 0, posted: 0, reposted: 0, skipped: 0, failed: 0 };
  },

  vendorMoneyMis: async (params: VendorMoneyMisParams = {}): Promise<VendorMoneyMisResponse> => {
    const query = vendorMoneyMisQuery(params);
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.VENDOR_MONEY_MIS, query);
    const inner = unwrap<VendorMoneyMisResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? '',
        to: params.to ?? '',
        rows: [],
        summary: {
          openingBalanceTotal: 0,
          periodCashTotal: 0,
          periodOnlineTotal: 0,
          periodCreditTotal: 0,
          periodPurchaseTotal: 0,
          currentPayableTotal: 0,
          vendorSummaries: [],
        },
      };
    }
    return normalizeVendorMoneyMis(inner);
  },

  vendorMoneyMisExcel: async (
    params: VendorMoneyMisParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = vendorMoneyMisQuery(params);
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadAccountingBlob(
      ACCOUNTING_ENDPOINTS.VENDOR_MONEY_MIS_EXCEL,
      query,
      `vendor-money-mis-${from}-${to}.xlsx`,
    );
  },

  vendorMoneyMisPdf: async (
    params: VendorMoneyMisParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = vendorMoneyMisQuery(params);
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadAccountingBlob(
      ACCOUNTING_ENDPOINTS.VENDOR_MONEY_MIS_PDF,
      query,
      `vendor-money-mis-${from}-${to}.pdf`,
    );
  },

  /**
   * Sales (customer-side) MIS.
   *
   * Its own endpoint rather than the vendor one with a `side` flag: that flag was dropped
   * backend-side as speculative, and the two ledgers return different shapes.
   */
  salesMis: async (params: SalesMisParams = {}): Promise<SalesMisResponse> => {
    const query = salesMisQuery(params);
    const raw = await apiClient.get<unknown>(ACCOUNTING_ENDPOINTS.SALES_MIS, query);
    const inner = unwrap<SalesMisResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? '',
        to: params.to ?? '',
        rows: [],
        summary: {
          openingBalanceTotal: 0,
          periodCashTotal: 0,
          periodOnlineTotal: 0,
          periodCreditTotal: 0,
          periodSalesTotal: 0,
          currentReceivableTotal: 0,
          customerSummaries: [],
        },
      };
    }
    return inner;
  },

  salesMisExcel: async (params: SalesMisParams = {}): Promise<{ blob: Blob; filename: string }> => {
    const query = salesMisQuery(params);
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadAccountingBlob(
      ACCOUNTING_ENDPOINTS.SALES_MIS_EXCEL,
      query,
      `sales-mis-${from}-${to}.xlsx`,
    );
  },

  salesMisPdf: async (params: SalesMisParams = {}): Promise<{ blob: Blob; filename: string }> => {
    const query = salesMisQuery(params);
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadAccountingBlob(
      ACCOUNTING_ENDPOINTS.SALES_MIS_PDF,
      query,
      `sales-mis-${from}-${to}.pdf`,
    );
  },
};
