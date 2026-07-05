import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../api/inventory.api';
import type { VendorPurchaseReturnSummary } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/session';
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

function formatReturnedDisplayQty(displayQuantityReturned: unknown): string {
  const d =
    typeof displayQuantityReturned === 'number' ? displayQuantityReturned : null;
  if (d == null || Number.isNaN(d) || !Number.isFinite(d)) {
    return '—';
  }
  const rounded = Math.round(d * 10000) / 10000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-8) {
    return String(Math.round(rounded));
  }
  return String(rounded);
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

export interface VendorReturnHistoryListProps {
  refreshTrigger?: number;
  filters?: HistoryFilters;
}

const FILTER_FETCH_LIMIT = 100;
const PAGE_SIZE = 20;

function applyVendorReturnFilters(
  rows: VendorPurchaseReturnSummary[],
  applied: HistoryFilters
): VendorPurchaseReturnSummary[] {
  return rows
    .filter((r) => isDateInRange(r.createdAt, applied.dateFrom, applied.dateTo))
    .filter((r) => matchesRegexField(applied.invoiceNo, r.invoiceNo))
    .filter((r) => matchesRegexField(applied.vendor, r.vendorName));
}

export function VendorReturnHistoryList({
  refreshTrigger,
  filters,
}: VendorReturnHistoryListProps) {
  const applied = filters;
  const filtering =
    applied != null && hasActiveHistoryFilters(applied, 'vendorReturnHistory');

  const [returns, setReturns] = useState<VendorPurchaseReturnSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      if (filtering && applied) {
        const res = await inventoryApi.listVendorPurchaseReturns({
          page: 1,
          limit: FILTER_FETCH_LIMIT,
        });
        const rows = applyVendorReturnFilters(res.returns ?? [], applied);
        const paged = paginateLocal(rows, page, limit);
        setReturns(paged.slice);
        setTotalPages(paged.totalPages);
        setTotal(paged.total);
      } else {
        const res = await inventoryApi.listVendorPurchaseReturns({ page, limit });
        setReturns(res.returns ?? []);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      }
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load supplier return history.'
      );
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, [applied, filtering, limit, notifyError, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && returns.length === 0) {
    return (
      <div className={recordStyles.container}>
        <div className={recordStyles.loading}>Loading supplier return history…</div>
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

      {returns.length === 0 ? (
        <div className={recordStyles.emptyState}>
          {filtering
            ? 'No supplier returns match these filters.'
            : 'No supplier returns yet.'}
        </div>
      ) : (
        <>
          <div className={recordStyles.list}>
            {returns.map((r) => (
              <div key={r.returnId} className={recordStyles.recordCard}>
                <div className={recordStyles.recordHeader}>
                  <div>
                    <strong>Credit note:</strong>{' '}
                    {r.supplierCreditNoteNo ?? r.returnId}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(r.createdAt)}
                  </div>
                </div>
                <div className={recordStyles.recordDetails}>
                  <div>
                    <strong>Purchase invoice:</strong>{' '}
                    {r.invoiceNo ?? '—'}
                  </div>
                  <div>
                    <strong>Vendor:</strong> {r.vendorName ?? '—'}
                  </div>
                  <div>
                    <strong>Lines returned:</strong> {r.totalLinesReturned}
                  </div>
                  <div>
                    <strong>Note value:</strong>{' '}
                    {formatCurrency(r.returnAmount)}
                  </div>
                  {r.reason ? (
                    <div>
                      <strong>Reason:</strong> {r.reason}
                    </div>
                  ) : null}
                </div>
                {(r.lines?.length ?? 0) > 0 ? (
                  <div className={recordStyles.breakdownWrap}>
                    <div className={recordStyles.breakdownTitle}>Line breakdown</div>
                    <div className={recordStyles.breakdownScroll}>
                      <table className={recordStyles.breakdownTable}>
                        <thead>
                          <tr>
                            <th scope="col">Product</th>
                            <th scope="col">Barcode</th>
                            <th scope="col">Qty returned</th>
                            <th scope="col">Taxable</th>
                            <th scope="col">CGST</th>
                            <th scope="col">SGST/UTGST</th>
                            <th scope="col">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.lines!.map((line, idx) => (
                            <tr
                              key={`${line.inventoryId ?? 'unknown'}-${idx}`}
                            >
                              <td>
                                {line.productName?.trim()
                                  ? line.productName
                                  : line.inventoryId ?? '—'}
                              </td>
                              <td>{line.barcode ?? '—'}</td>
                              <td>
                                {formatReturnedDisplayQty(
                                  line.displayQuantityReturned
                                )}
                              </td>
                              <td>{moneyOrDash(line.taxableValue)}</td>
                              <td>{moneyOrDash(line.centralGstAmount)}</td>
                              <td>{moneyOrDash(line.stateGstAmount)}</td>
                              <td>{moneyOrDash(line.lineNoteValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className={recordStyles.breakdownLegacyNote}>
                    No saved line breakdown for this debit note (often older
                    returns).
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
            aria-label="Supplier return pages"
          />
        </>
      )}
    </div>
  );
}
