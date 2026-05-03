import { useState, useEffect, useCallback } from 'react';
import { refundsApi } from '@inventory-platform/api';
import type { Refund } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import styles from './RefundHistoryList.module.css';
import { PaginationBar } from './PaginationBar';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function moneyOrDash(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) {
    return '—';
  }
  return formatCurrency(n);
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
          : 'Failed to load return history. Please try again.';
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
        <div className={styles.loading}>Loading return history...</div>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>No returns found.</div>
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
                <strong>Credit note:</strong>{' '}
                {refund.creditNoteNo ?? refund.refundId}
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
                <strong>Items Returned:</strong> {refund.totalItemsRefunded}
              </div>
              <div>
                <strong>Return Amount:</strong>{' '}
                {formatCurrency(refund.refundAmount)}
              </div>
              {refund.reason && (
                <div>
                  <strong>Reason:</strong> {refund.reason}
                </div>
              )}
            </div>
            {refund.refundedItems && refund.refundedItems.length > 0 ? (
              <div className={styles.breakdownWrap}>
                <div className={styles.breakdownTitle}>Returned items</div>
                <div className={styles.breakdownScroll}>
                  <table className={styles.breakdownTable}>
                    <thead>
                      <tr>
                        <th scope="col">Product</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Unit price</th>
                        <th scope="col">Line refund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refund.refundedItems.map((row, idx) => (
                        <tr key={`${row.inventoryId}-${idx}`}>
                          <td>
                            {row.name?.trim()
                              ? row.name
                              : row.inventoryId ?? '—'}
                          </td>
                          <td>{row.quantity}</td>
                          <td>{moneyOrDash(row.priceToRetail)}</td>
                          <td>{moneyOrDash(row.itemRefundAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className={styles.breakdownLegacyNote}>
                No line-by-line breakdown saved for this return (often older records).
              </p>
            )}
          </div>
        ))}
      </div>

      <PaginationBar
        page={page - 1}
        totalPages={totalPages}
        totalItems={total}
        disabled={isLoading}
        onPageChange={(p) => handlePageChange(p + 1)}
        aria-label="Customer return pages"
      />
    </div>
  );
}
