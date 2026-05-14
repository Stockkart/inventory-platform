import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  AccountResponse,
  AccountingPartyType,
  BackfillResult,
  CreateAccountRequest,
  CreateJournalEntryRequest,
  JournalEntriesPageResponse,
  JournalEntryResponse,
  JournalSource,
  LedgerPageResponse,
  PartyStatementResponse,
  PartySummariesResponse,
  ReverseJournalRequest,
  TrialBalanceResponse,
  UpdateAccountRequest,
} from '@inventory-platform/types';

function unwrap<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return raw as T;
  const o = raw as Record<string, unknown>;
  if ('success' in o && 'data' in o) return o.data as T;
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

export const accountingApi = {
  accounts: async (): Promise<AccountResponse[]> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.ACCOUNTS);
    const inner = unwrap<AccountResponse[]>(raw);
    return Array.isArray(inner) ? inner.map(normalizeAccount) : [];
  },

  createAccount: async (body: CreateAccountRequest): Promise<AccountResponse> => {
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.ACCOUNTING.ACCOUNTS, body);
    const inner = unwrap<AccountResponse>(raw);
    if (!inner) throw new Error('Invalid response creating account');
    return normalizeAccount(inner);
  },

  updateAccount: async (
    id: string,
    body: UpdateAccountRequest
  ): Promise<AccountResponse> => {
    const raw = await apiClient.patch<unknown>(
      API_ENDPOINTS.ACCOUNTING.ACCOUNT_BY_ID(id),
      body
    );
    const inner = unwrap<AccountResponse>(raw);
    if (!inner) throw new Error('Invalid response updating account');
    return normalizeAccount(inner);
  },

  journals: async (
    params: JournalListParams = {}
  ): Promise<JournalEntriesPageResponse> => {
    const raw = await apiClient.get<unknown>(
      API_ENDPOINTS.ACCOUNTING.JOURNAL,
      toQuery({
        sourceType: params.sourceType,
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 20,
      })
    );
    const inner = unwrap<JournalEntriesPageResponse>(raw);
    if (!inner || !Array.isArray(inner.entries)) {
      return { entries: [], page: 0, size: params.size ?? 20, totalItems: 0, totalPages: 0 };
    }
    return { ...inner, entries: inner.entries.map(normalizeJournalEntry) };
  },

  journal: async (id: string): Promise<JournalEntryResponse> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.JOURNAL_BY_ID(id));
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Journal entry not found');
    return normalizeJournalEntry(inner);
  },

  createManualJournal: async (
    body: CreateJournalEntryRequest
  ): Promise<JournalEntryResponse> => {
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.ACCOUNTING.JOURNAL, body);
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Invalid response posting manual journal');
    return normalizeJournalEntry(inner);
  },

  reverseJournal: async (
    id: string,
    body: ReverseJournalRequest = {}
  ): Promise<JournalEntryResponse> => {
    const raw = await apiClient.post<unknown>(
      API_ENDPOINTS.ACCOUNTING.JOURNAL_REVERSE(id),
      body
    );
    const inner = unwrap<JournalEntryResponse>(raw);
    if (!inner) throw new Error('Invalid response reversing journal');
    return normalizeJournalEntry(inner);
  },

  ledger: async (
    accountId: string,
    params: LedgerParams = {}
  ): Promise<LedgerPageResponse> => {
    const raw = await apiClient.get<unknown>(
      API_ENDPOINTS.ACCOUNTING.LEDGER(accountId),
      toQuery({
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 50,
      })
    );
    const inner = unwrap<LedgerPageResponse>(raw);
    if (!inner) {
      throw new Error('Account ledger not found');
    }
    return normalizeLedgerPage(inner);
  },

  parties: async (params: PartiesListParams): Promise<PartySummariesResponse> => {
    const raw = await apiClient.get<unknown>(
      API_ENDPOINTS.ACCOUNTING.PARTIES,
      toQuery({ type: params.type, from: params.from, to: params.to })
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
    params: PartyStatementParams = {}
  ): Promise<PartyStatementResponse> => {
    const raw = await apiClient.get<unknown>(
      API_ENDPOINTS.ACCOUNTING.PARTY_STATEMENT(type, encodeURIComponent(partyRefId)),
      toQuery({
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 50,
      })
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
    const raw = await apiClient.get<unknown>(
      API_ENDPOINTS.ACCOUNTING.TRIAL_BALANCE,
      toQuery({ asOf })
    );
    const inner = unwrap<TrialBalanceResponse>(raw);
    if (!inner) {
      const today = (asOf ?? new Date().toISOString().slice(0, 10)) as string;
      return { asOf: today, rows: [], totalDebit: 0, totalCredit: 0 };
    }
    return normalizeTrialBalance(inner);
  },

  backfill: async (
    options: { from?: string; to?: string; force?: boolean } = {}
  ): Promise<BackfillResult> => {
    const raw = await apiClient.post<unknown>(
      `${API_ENDPOINTS.ACCOUNTING.BACKFILL}${toQs({
        from: options.from,
        to: options.to,
        force: options.force ? 'true' : undefined,
      })}`,
      {}
    );
    const inner = unwrap<BackfillResult>(raw);
    return inner ?? { processed: 0, posted: 0, reposted: 0, skipped: 0, failed: 0 };
  },
};

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
