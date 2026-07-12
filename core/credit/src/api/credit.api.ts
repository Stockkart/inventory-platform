import { apiClient } from '@inventory-platform/api-client';
import type {
  CreateCreditEntryDto,
  CreditAccountResponse,
  CreditEntriesPageResponse,
  CreditEntryResponse,
} from '@inventory-platform/credit/types';
import { CREDIT_ENDPOINTS } from './endpoints';

function unwrapApiData<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return raw as T;
  const o = raw as Record<string, unknown>;
  if ('success' in o && 'data' in o) return o.data as T;
  return raw as T;
}

function asNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
    ? Number(v)
    : 0;
}

function normalizeEntry(e: CreditEntryResponse): CreditEntryResponse {
  return { ...e, amount: asNum(e.amount), balanceAfter: asNum(e.balanceAfter) };
}

function normalizeAccount(a: CreditAccountResponse): CreditAccountResponse {
  return { ...a, currentBalance: asNum(a.currentBalance) };
}

export const creditApi = {
  charge: async (body: CreateCreditEntryDto): Promise<CreditEntryResponse> => {
    const raw = await apiClient.post<unknown>(CREDIT_ENDPOINTS.CHARGE, body);
    const inner = unwrapApiData<CreditEntryResponse>(raw);
    if (!inner || typeof inner !== 'object') throw new Error('Invalid charge response');
    return normalizeEntry(inner as CreditEntryResponse);
  },

  settlement: async (body: CreateCreditEntryDto): Promise<CreditEntryResponse> => {
    const raw = await apiClient.post<unknown>(CREDIT_ENDPOINTS.SETTLEMENT, body);
    const inner = unwrapApiData<CreditEntryResponse>(raw);
    if (!inner || typeof inner !== 'object') throw new Error('Invalid settlement response');
    return normalizeEntry(inner as CreditEntryResponse);
  },

  accounts: async (): Promise<CreditAccountResponse[]> => {
    const raw = await apiClient.get<unknown>(CREDIT_ENDPOINTS.ACCOUNTS);
    const inner = unwrapApiData<CreditAccountResponse[]>(raw);
    return Array.isArray(inner)
      ? inner.map((a) => normalizeAccount(a as CreditAccountResponse))
      : [];
  },

  entries: async (accountId: string, page = 0, size = 20): Promise<CreditEntriesPageResponse> => {
    const raw = await apiClient.get<unknown>(CREDIT_ENDPOINTS.ENTRIES(accountId), {
      page: String(page),
      size: String(size),
    });
    const inner = unwrapApiData<CreditEntriesPageResponse>(raw);
    if (
      !inner ||
      typeof inner !== 'object' ||
      !Array.isArray((inner as CreditEntriesPageResponse).entries)
    ) {
      return { entries: [], page: 0, size, totalItems: 0, totalPages: 0 };
    }
    const p = inner as CreditEntriesPageResponse;
    return { ...p, entries: p.entries.map((e) => normalizeEntry(e as CreditEntryResponse)) };
  },
};
