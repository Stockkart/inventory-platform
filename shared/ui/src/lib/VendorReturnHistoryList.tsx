import { FormEvent, useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '@inventory-platform/api';
import type { VendorPurchaseReturnSummary } from '@inventory-platform/types';
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

function moneyOrDash(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) {
    return '—';
  }
  return formatCurrency(n);
}

/** Returned qty in invoice / shelf (sell) units only — never base units on this screen. */
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
}

export function VendorReturnHistoryList({
  refreshTrigger,
}: VendorReturnHistoryListProps) {
  const [returns, setReturns] = useState<VendorPurchaseReturnSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [appliedInvoiceFilter, setAppliedInvoiceFilter] = useState('');
  const { error: notifyError } = useNotify;

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await inventoryApi.listVendorPurchaseReturns({
        page,
        limit,
        invoiceNo: appliedInvoiceFilter || undefined,
      });
      setReturns(res.returns ?? []);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load supplier return history.'
      );
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, [appliedInvoiceFilter, limit, notifyError, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshTrigger]);

  useEffect(() => {
    setPage(1);
  }, [appliedInvoiceFilter]);

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedInvoiceFilter(invoiceFilter.trim());
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && returns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading supplier return history…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleFilterSubmit} className={styles.filterBar}>
        <label htmlFor="vendorReturnInvoiceFilter" className={styles.filterLabel}>
          Filter by invoice no.
        </label>
        <input
          id="vendorReturnInvoiceFilter"
          type="text"
          className={styles.filterInput}
          value={invoiceFilter}
          onChange={(e) => setInvoiceFilter(e.target.value)}
          placeholder="Exact purchase invoice number"
          aria-label="Filter by purchase invoice number"
        />
        <button type="submit" className={styles.filterBtn}>
          Apply
        </button>
        {appliedInvoiceFilter ? (
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => {
              setInvoiceFilter('');
              setAppliedInvoiceFilter('');
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {returns.length === 0 ? (
        <div className={styles.emptyState}>
          {appliedInvoiceFilter
            ? 'No supplier returns match this invoice number.'
            : 'No supplier returns yet.'}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {returns.map((r) => (
              <div key={r.returnId} className={styles.refundCard}>
                <div className={styles.refundHeader}>
                  <div>
                    <strong>Credit note:</strong>{' '}
                    {r.supplierCreditNoteNo ?? r.returnId}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(r.createdAt)}
                  </div>
                </div>
                <div className={styles.refundDetails}>
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
                  <div className={styles.breakdownWrap}>
                    <div className={styles.breakdownTitle}>Line breakdown</div>
                    <div className={styles.breakdownScroll}>
                      <table className={styles.breakdownTable}>
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
                              <td>{formatReturnedDisplayQty(line.displayQuantityReturned)}</td>
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
                  <p className={styles.breakdownLegacyNote}>
                    No saved line breakdown for this debit note (often older
                    returns).
                  </p>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageButton}
                disabled={page === 1 || isLoading}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                type="button"
                className={styles.pageButton}
                disabled={page === totalPages || isLoading}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
