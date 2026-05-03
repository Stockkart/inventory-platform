import { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '@inventory-platform/api';
import type { Purchase } from '@inventory-platform/types';
import { PaginationBar } from './PaginationBar';
import { PurchaseCard } from './PurchaseCard';
import styles from './PurchaseList.module.css';
import { useNotify } from '@inventory-platform/store';

interface PurchaseListProps {
  onPurchaseChange?: () => void;
}

export function PurchaseList({ onPurchaseChange }: PurchaseListProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await purchasesApi.getAll({
        page,
        limit,
        order: 'soldAt:desc',
      });

      // Filter out PENDING orders, only show COMPLETED and CANCELLED
      const filteredPurchases = response.purchases.filter(
        (purchase) =>
          purchase.status === 'COMPLETED' || purchase.status === 'CANCELLED'
      );

      setPurchases(filteredPurchases);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setPage(1); // Reset to first page when limit changes
  };

  if (isLoading && purchases.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading purchases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchPurchases} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {purchases.length > 0 && (
        <div className={styles.summary}>
          <p className={styles.summaryText}>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{' '}
            of {total} purchases
          </p>
          <div className={styles.limitSelector}>
            <label htmlFor="limit-select" className={styles.limitLabel}>
              Items per page:
            </label>
            <select
              id="limit-select"
              className={styles.limitSelect}
              value={limit}
              onChange={handleLimitChange}
              disabled={isLoading}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {purchases.map((purchase) => (
          <PurchaseCard key={purchase.purchaseId} purchase={purchase} />
        ))}
      </div>

      {purchases.length === 0 && !isLoading && (
        <div className={styles.emptyState}>
          <p>No purchases found.</p>
        </div>
      )}

      <PaginationBar
        page={page - 1}
        totalPages={totalPages}
        totalItems={total}
        disabled={isLoading}
        onPageChange={(p) => handlePageChange(p + 1)}
        aria-label="Sale history pages"
      />
    </div>
  );
}
