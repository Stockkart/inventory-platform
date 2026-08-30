import { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '@inventory-platform/product/api';
import type { Purchase } from '@inventory-platform/product/types';
import {
  Alert,
  CenteredLoader,
  EmptyState,
  PaginationBar,
  Stack,
} from '@inventory-platform/ui-kit';
import { SaleHistoryCard } from './SaleHistoryCard';
import { HistoryListSummary } from './HistoryListSummary';
import { useNotify } from '@inventory-platform/session';
import type { HistoryFilters } from './historyFilters';
import { hasActiveHistoryFilters } from './historyFilters';

interface PurchaseListProps {
  onPurchaseChange?: () => void;
  filters?: HistoryFilters;
}

const PAGE_SIZE = 20;

function isSaleStatus(purchase: Purchase): boolean {
  return purchase.status === 'COMPLETED' || purchase.status === 'CANCELLED';
}

export function PurchaseList({ filters }: PurchaseListProps) {
  const applied = filters;
  const filtering = applied != null && hasActiveHistoryFilters(applied, 'saleHistory');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (filtering && applied) {
        // The server does the narrowing. Fetching a fixed window of recent
        // sales and sifting it here could only ever find what happened to fall
        // inside that window: with a hundred rows fetched, an invoice from the
        // start of the month was reported as not existing.
        const response = await purchasesApi.search({
          page,
          limit,
          invoiceNo: applied.invoiceNo || undefined,
          from: applied.dateFrom || undefined,
          to: applied.dateTo || undefined,
          customer: applied.customer || undefined,
        });
        setPurchases(response.purchases.filter(isSaleStatus));
        setTotalPages(response.totalPages);
        setTotal(response.total);
      } else {
        const response = await purchasesApi.getAll({
          page,
          limit,
          order: 'soldAt:desc',
        });
        const filteredPurchases = response.purchases.filter(isSaleStatus);
        setPurchases(filteredPurchases);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load purchases';
      notifyError(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [applied, filtering, limit, notifyError, page]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && purchases.length === 0) {
    return (
      <Stack width="full">
        <CenteredLoader label="Loading sale history…" />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack width="full">
        <Alert variant="danger">{error}</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full">
      <HistoryListSummary
        page={page}
        limit={limit}
        total={total}
        filtered={filtering}
        label="sales"
      />

      {purchases.length === 0 && !isLoading ? (
        <EmptyState title={filtering ? 'No sales match these filters.' : 'No sales found.'} />
      ) : (
        <Stack gap="md">
          {purchases.map((purchase) => (
            <SaleHistoryCard key={purchase.purchaseId} purchase={purchase} />
          ))}
        </Stack>
      )}

      <PaginationBar
        page={page - 1}
        totalPages={totalPages}
        totalItems={total}
        disabled={isLoading}
        onPageChange={(p) => handlePageChange(p + 1)}
        aria-label="Sale history pages"
      />
    </Stack>
  );
}
