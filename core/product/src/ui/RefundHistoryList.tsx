import { useState, useEffect, useCallback } from 'react';
import { refundsApi } from '@inventory-platform/api';
import type { Refund } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import recordStyles from './HistoryRecordList.module.css';
import { PaginationBar } from '@inventory-platform/ui-kit';
import { HistoryListSummary } from './HistoryListSummary';
import type { HistoryFilters } from './historyFilters';
import {
  hasActiveHistoryFilters,
  isDateInRange,
  paginateLocal,
  matchesRegexField,
} from './historyFilters';

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
  refreshTrigger?: number;
  filters?: HistoryFilters;
}

const FILTER_FETCH_LIMIT = 100;
const PAGE_SIZE = 20;

function applyRefundFilters(rows: Refund[], applied: HistoryFilters): Refund[] {
  return rows
    .filter((r) => isDateInRange(r.createdAt, applied.dateFrom, applied.dateTo))
    .filter((r) => matchesRegexField(applied.invoiceNo, r.invoiceNo))
    .filter((r) =>
      matchesRegexField(
        applied.customer,
        r.customerName,
        r.customerPhone,
        r.customerEmail
      )
    );
}

export function RefundHistoryList({
  refreshTrigger,
  filters,
}: RefundHistoryListProps) {
  const applied = filters;
  const filtering =
    applied != null &&
    hasActiveHistoryFilters(applied, 'customerReturnHistory');

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);

    try {
      if (filtering && applied) {
        const response = await refundsApi.getAll({
          page: 1,
          limit: FILTER_FETCH_LIMIT,
        });
        const rows = applyRefundFilters(response.refunds, applied);
        const paged = paginateLocal(rows, page, limit);
        setRefunds(paged.slice);
        setTotalPages(paged.totalPages);
        setTotal(paged.total);
      } else {
        const response = await refundsApi.getAll({ page, limit });
        setRefunds(response.refunds);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      }
    } catch (err) {
      notifyError(
        err instanceof Error
          ? err.message
          : 'Failed to load return history. Please try again.'
      );
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  }, [applied, filtering, limit, notifyError, page]);

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
      <div className={recordStyles.container}>
        <div className={recordStyles.loading}>Loading return history…</div>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className={recordStyles.container}>
        <div className={recordStyles.emptyState}>
          {filtering ? 'No returns match these filters.' : 'No returns found.'}
        </div>
      </div>
    );
  }

  return (
    <div className={recordStyles.container}>
      <HistoryListSummary
        page={page}
        limit={limit}
        total={total}
        filtered={filtering}
        label="returns"
      />
      <div className={recordStyles.list}>
        {refunds.map((refund) => (
          <div key={refund.refundId} className={recordStyles.recordCard}>
            <div className={recordStyles.recordHeader}>
              <div>
                <strong>Credit note:</strong>{' '}
                {refund.creditNoteNo ?? refund.refundId}
              </div>
              <div>
                <strong>Date:</strong> {formatDate(refund.createdAt)}
              </div>
            </div>
            <div className={recordStyles.recordDetails}>
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
              {refund.reason ? (
                <div>
                  <strong>Reason:</strong> {refund.reason}
                </div>
              ) : null}
            </div>
            {refund.refundedItems && refund.refundedItems.length > 0 ? (
              <div className={recordStyles.breakdownWrap}>
                <div className={recordStyles.breakdownTitle}>Returned items</div>
                <div className={recordStyles.breakdownScroll}>
                  <table className={recordStyles.breakdownTable}>
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
              <p className={recordStyles.breakdownLegacyNote}>
                No line-by-line breakdown saved for this return (often older
                records).
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
