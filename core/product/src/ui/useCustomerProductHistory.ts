import { useEffect, useMemo, useState } from 'react';
import { purchasesApi } from '@inventory-platform/product/api';
import type { CustomerProductHistoryResponse } from '@inventory-platform/product/types';
const DEBOUNCE_MS = 300;
const historyCache = new Map<string, CustomerProductHistoryResponse>();

function buildCacheKey(
  customerId: string | null | undefined,
  customerPhone: string | null | undefined,
  refs: string[],
  excludePurchaseId: string | null | undefined,
  limit: number
): string {
  return `${customerId ?? ''}|${customerPhone ?? ''}|${excludePurchaseId ?? ''}|${limit}|${refs.join(',')}`;
}

export interface UseCustomerProductHistoryParams {
  customerId?: string | null;
  customerPhone?: string | null;
  sellableRefs: string[];
  excludePurchaseId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useCustomerProductHistory({
  customerId,
  customerPhone,
  sellableRefs,
  excludePurchaseId,
  limit = 3,
  enabled = true,
}: UseCustomerProductHistoryParams) {
  const stableRefs = useMemo(() => {
    const unique = [...new Set(sellableRefs.filter((ref) => ref?.trim()))];
    unique.sort();
    return unique;
  }, [sellableRefs]);

  const hasCustomer = Boolean(customerId?.trim() || customerPhone?.trim());
  const [data, setData] = useState<CustomerProductHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !hasCustomer || stableRefs.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }

    const key = buildCacheKey(
      customerId,
      customerPhone,
      stableRefs,
      excludePurchaseId,
      limit
    );
    const cached = historyCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      purchasesApi
        .getCustomerProductHistory({
          customerId: customerId?.trim() || undefined,
          customerPhone: customerPhone?.trim() || undefined,
          sellableRefs: stableRefs,
          excludePurchaseId: excludePurchaseId?.trim() || undefined,
          limit,
        })
        .then((response) => {
          if (cancelled) return;
          historyCache.set(key, response);
          setData(response);
        })
        .catch(() => {
          if (cancelled) return;
          setData(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    hasCustomer,
    customerId,
    customerPhone,
    stableRefs,
    excludePurchaseId,
    limit,
  ]);

  return { data, loading };
}
