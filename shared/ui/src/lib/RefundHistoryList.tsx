import { useState, useEffect, useCallback } from 'react';
import { refundsApi } from '@inventory-platform/api';
import type { Refund } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import styles from './RefundHistoryList.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export interface RefundHistoryListProps {
  /** Optional. When changed, triggers a refresh (e.g. after processing a refund). */
  refreshTrigger?: number;
}

export function RefundHistoryList({ refreshTrigger }: RefundHistoryListProps) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await refundsApi.getAll({
        page,
        limit,
      });
      setRefunds(response.refunds);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load refund history. Please try again.';
      notifyError(errorMessage);
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, notifyError]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && refunds.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading refund history...</div>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>No refunds found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {refunds.map((refund) => (
          <div key={refund.refundId} className={styles.refundCard}>
            <div className={styles.refundHeader}>
              <div>
                <strong>Refund ID:</strong> {refund.refundId}
              </div>
              <div>
                <strong>Date:</strong> {formatDate(refund.createdAt)}
              </div>
            </div>
            <div className={styles.refundDetails}>
              <div>
                <strong>Invoice No:</strong> {refund.invoiceNo}
              </div>
              <div>
                <strong>Customer:</strong> {refund.customerName}
              </div>
              <div>
                <strong>Phone:</strong> {refund.customerPhone}
              </div>
              <div>
                <strong>Items Refunded:</strong> {refund.totalItemsRefunded}
              </div>
              <div>
                <strong>Refund Amount:</strong>{' '}
                {formatCurrency(refund.refundAmount)}
              </div>
              {refund.reason && (
                <div>
                  <strong>Reason:</strong> {refund.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || isLoading}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            className={styles.pageButton}
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || isLoading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
