import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CreateLedgerEntryRequest,
  CustomerReceivablesResponse,
  LedgerBalance,
  LedgerEntriesResponse,
  LedgerEntry,
  LedgerPartyType,
  PayablesResponse,
  PayablesToShopsResponse,
  ReceivablesResponse,
} from '@inventory-platform/types';

export const ledgerApi = {
  createEntry: async (
    data: CreateLedgerEntryRequest
  ): Promise<LedgerEntry> => {
    const response = await apiClient.post<ApiResponse<LedgerEntry>>(
      API_ENDPOINTS.LEDGER.BASE,
      data
    );
    return (response as ApiResponse<LedgerEntry>).data;
  },

  getBalance: async (
    partyType: LedgerPartyType,
    partyId: string
  ): Promise<LedgerBalance> => {
    const response = await apiClient.get<ApiResponse<LedgerBalance>>(
      API_ENDPOINTS.LEDGER.BALANCE,
      { partyType, partyId }
    );
    return (response as ApiResponse<LedgerBalance>).data;
  },

  listEntries: async (params?: {
    partyType?: LedgerPartyType;
    partyId?: string;
    page?: number;
    size?: number;
  }): Promise<LedgerEntriesResponse> => {
    const q: Record<string, string> = {};
    if (params?.partyType) q.partyType = params.partyType;
    if (params?.partyId) q.partyId = params.partyId;
    if (params?.page != null) q.page = String(params.page);
    if (params?.size != null) q.size = String(params.size);
    const response = await apiClient.get<ApiResponse<LedgerEntriesResponse>>(
      API_ENDPOINTS.LEDGER.ENTRIES,
      q
    );
    return (response as ApiResponse<LedgerEntriesResponse>).data;
  },

  /** Amounts to collect when this shop is the vendor's shop (buyer shops owe us). */
  getReceivables: async (): Promise<ReceivablesResponse> => {
    const response = await apiClient.get<ApiResponse<ReceivablesResponse>>(
      API_ENDPOINTS.LEDGER.RECEIVABLES
    );
    return (response as ApiResponse<ReceivablesResponse>).data;
  },

  /** Amounts to collect from customers (we sold to them on credit). */
  getCustomerReceivables: async (): Promise<CustomerReceivablesResponse> => {
    const response = await apiClient.get<ApiResponse<CustomerReceivablesResponse>>(
      API_ENDPOINTS.LEDGER.CUSTOMER_RECEIVABLES
    );
    return (response as ApiResponse<CustomerReceivablesResponse>).data;
  },

  /** Amounts to pay when this shop owes vendors. */
  getPayables: async (): Promise<PayablesResponse> => {
    const response = await apiClient.get<ApiResponse<PayablesResponse>>(
      API_ENDPOINTS.LEDGER.PAYABLES
    );
    return (response as ApiResponse<PayablesResponse>).data;
  },

  /** Amounts to pay to other shops (bought from them as customer on credit). */
  getPayablesToShops: async (): Promise<PayablesToShopsResponse> => {
    const response = await apiClient.get<ApiResponse<PayablesToShopsResponse>>(
      API_ENDPOINTS.LEDGER.PAYABLES_TO_SHOPS
    );
    return (response as ApiResponse<PayablesToShopsResponse>).data;
  },
};
