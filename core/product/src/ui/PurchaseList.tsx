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
import {
  hasActiveHistoryFilters,
  isDateInRange,
  paginateLocal,
  matchesRegexField,
} from './historyFilters';

interface PurchaseListProps {
  onPurchaseChange?: () => void;
  filters?: HistoryFilters;
}

const FILTER_FETCH_LIMIT = 100;
const PAGE_SIZE = 20;

function isSaleStatus(purchase: Purchase): boolean {
  return purchase.status === 'COMPLETED' || purchase.status === 'CANCELLED';
}

function applySaleFilters(rows: Purchase[], applied: HistoryFilters): Purchase[] {
  return rows
    .filter(isSaleStatus)
    .filter((p) => isDateInRange(p.soldAt, applied.dateFrom, applied.dateTo))
    .filter((p) => matchesRegexField(applied.invoiceNo, p.invoiceNo))
    .filter((p) => matchesRegexField(applied.customer, p.customerName, p.customerPhone))
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
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
        const response = await purchasesApi.getAll({
          page: 1,
          limit: FILTER_FETCH_LIMIT,
          order: 'soldAt:desc',
        });
        const rows = applySaleFilters(response.purchases, applied);
        const paged = paginateLocal(rows, page, limit);
        setPurchases(paged.slice);
        setTotalPages(paged.totalPages);
        setTotal(paged.total);
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
