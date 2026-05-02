import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '@inventory-platform/types';
import type {
  AccountingShopSummary,
  CreateGlAccountDto,
  GlAccountResponse,
  JournalEntryResponse,
  JournalLineResponse,
  JournalListEnvelope,
  TrialBalanceLine,
} from '@inventory-platform/types';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function normalizeGlAccountResponse(row: GlAccountResponse): GlAccountResponse {
  return {
    ...row,
    totalDebit: num(row.totalDebit, 0),
    totalCredit: num(row.totalCredit, 0),
  };
}

const EMPTY_JOURNAL_ENVELOPE: JournalListEnvelope = {
  journals: [],
  page: 0,
  size: 20,
  totalItems: 0,
  totalPages: 0,
};

function normalizeJournalLine(row: JournalLineResponse): JournalLineResponse {
  return {
    ...row,
    debit: num(row.debit, 0),
    credit: num(row.credit, 0),
  };
}

function normalizeJournalEntry(entry: JournalEntryResponse): JournalEntryResponse {
  const lines = Array.isArray(entry.lines) ? entry.lines.map(normalizeJournalLine) : [];
  lines.sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0));
  return {
    ...entry,
    totalDebitSum: num(entry.totalDebitSum, 0),
    totalCreditSum: num(entry.totalCreditSum, 0),
    lines,
  };
}

function normalizeJournalListEnvelope(inner: JournalListEnvelope): JournalListEnvelope {
  return {
    ...inner,
    journals: Array.isArray(inner.journals)
      ? inner.journals.map((j) => normalizeJournalEntry(j as JournalEntryResponse))
      : [],
  };
}

/** Supports both `{ success, data }` and already-unwrapped payloads. */
function unwrapApiData<T>(raw: unknown): T | undefined {
  if (raw == null) {
    return undefined;
  }
  if (typeof raw !== 'object') {
    return raw as T;
  }
  const o = raw as Record<string, unknown>;
  if ('success' in o && 'data' in o) {
    return o.data as T;
  }
  return raw as T;
}

export const accountingApi = {
  bootstrapChart: async (): Promise<void> => {
    await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.ACCOUNTING.CHART_BOOTSTRAP);
  },

  shopSummary: async (): Promise<AccountingShopSummary> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.SHOP_SUMMARY);
    const inner = unwrapApiData<Partial<AccountingShopSummary> | undefined>(raw);
    if (inner?.shopId != null && String(inner.shopId).trim() !== '') {
      return {
        shopId: String(inner.shopId).trim(),
        chartAccountCount:
          typeof inner.chartAccountCount === 'number' ? inner.chartAccountCount : 0,
        journalEntryCount:
          typeof inner.journalEntryCount === 'number' ? inner.journalEntryCount : 0,
      };
    }
    return { shopId: '', chartAccountCount: 0, journalEntryCount: 0 };
  },

  glAccounts: async (): Promise<GlAccountResponse[]> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.GL_ACCOUNTS);
    const inner = unwrapApiData<GlAccountResponse[]>(raw);
    const list = Array.isArray(inner) ? inner : [];
    return list.map(normalizeGlAccountResponse);
  },

  createGlAccount: async (body: CreateGlAccountDto): Promise<GlAccountResponse> => {
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.ACCOUNTING.GL_ACCOUNTS, body);
    const inner = unwrapApiData<GlAccountResponse>(raw);
    if (inner && typeof inner === 'object' && 'id' in inner) {
      return normalizeGlAccountResponse(inner as GlAccountResponse);
    }
    throw new Error('Invalid create account response');
  },

  trialBalance: async (): Promise<TrialBalanceLine[]> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.TRIAL_BALANCE);
    const inner = unwrapApiData<TrialBalanceLine[]>(raw);
    return Array.isArray(inner) ? inner : [];
  },

  listJournals: async (page?: number, size?: number): Promise<JournalListEnvelope> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.JOURNALS, {
      page: page != null ? String(page) : '0',
      size: size != null ? String(size) : '20',
    });
    const inner = unwrapApiData<JournalListEnvelope>(raw);
    if (
      inner &&
      typeof inner === 'object' &&
      'journals' in inner &&
      Array.isArray((inner as JournalListEnvelope).journals)
    ) {
      return normalizeJournalListEnvelope(inner as JournalListEnvelope);
    }
    return { ...EMPTY_JOURNAL_ENVELOPE };
  },

  getJournal: async (id: string): Promise<JournalEntryResponse> => {
    const raw = await apiClient.get<unknown>(API_ENDPOINTS.ACCOUNTING.JOURNAL_BY_ID(id));
    const inner = unwrapApiData<JournalEntryResponse>(raw);
    if (!inner || typeof inner !== 'object') {
      throw new Error('Journal not found');
    }
    return normalizeJournalEntry(inner);
  },
};
