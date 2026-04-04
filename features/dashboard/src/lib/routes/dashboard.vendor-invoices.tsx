import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '@inventory-platform/api';
import type {
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceSummary,
} from '@inventory-platform/types';
import styles from './dashboard.vendor-invoices.module.css';

export function meta() {
  return [
    { title: 'Vendor invoices - StockKart' },
    {
      name: 'description',
      content: 'Purchase invoices from vendors and line items',
    },
  ];
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function VendorInvoicesPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [invoices, setInvoices] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [detail, setDetail] = useState<VendorPurchaseInvoiceDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.listVendorPurchaseInvoices(page, size);
      setInvoices(res.invoices ?? []);
      setTotalPages(res.page?.totalPages ?? 0);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load vendor invoices'
      );
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const d = await inventoryApi.getVendorPurchaseInvoice(id);
      setDetail(d);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load invoice details'
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendor purchase invoices</h1>
        <p className={styles.subtitle}>
          Stock-in registrations that included invoice metadata. Open a row to
          see products and inventory links.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : invoices.length === 0 ? (
        <div className={styles.empty}>
          No stock-in records yet. Each bulk registration creates a vendor
          purchase invoice (use your supplier&apos;s number or an auto-generated
          ID).
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice no.</th>
                  <th>Stock-in ID</th>
                  <th>Vendor ID</th>
                  <th>Date</th>
                  <th>Lines</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      {inv.invoiceNo}
                      {inv.synthetic ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          (auto)
                        </span>
                      ) : null}
                    </td>
                    <td
                      style={{
                        fontSize: '0.75rem',
                        wordBreak: 'break-all',
                        maxWidth: 100,
                      }}
                    >
                      {inv.id}
                    </td>
                    <td
                      style={{
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        maxWidth: 120,
                      }}
                    >
                      {inv.vendorId}
                    </td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td>{inv.lineCount}</td>
                    <td>{formatMoney(inv.invoiceTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.rowBtn}
                        onClick={() => openDetail(inv.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Page {page + 1}
              {totalPages > 0 ? ` / ${totalPages}` : ''}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {detailLoading && (
        <div className={styles.empty} style={{ marginTop: 16 }}>
          Loading details…
        </div>
      )}

      {detail && !detailLoading && (
        <div className={styles.detail}>
          <div className={styles.detailTitle}>
            Invoice {detail.invoiceNo}
          </div>
          <div className={styles.metaGrid}>
            <div>
              <strong>Vendor</strong>
              <div style={{ wordBreak: 'break-all' }}>{detail.vendorId}</div>
            </div>
            <div>
              <strong>Stock-in ID</strong>
              <div style={{ wordBreak: 'break-all' }}>{detail.id}</div>
            </div>
            {detail.legacyLotId ? (
              <div>
                <strong>Former lot ref.</strong>
                <div style={{ wordBreak: 'break-all' }}>{detail.legacyLotId}</div>
              </div>
            ) : null}
            {detail.synthetic ? (
              <div>
                <strong>Type</strong>
                <div>Auto-generated invoice no.</div>
              </div>
            ) : null}
            <div>
              <strong>Invoice date</strong>
              <div>{formatDate(detail.invoiceDate)}</div>
            </div>
            <div>
              <strong>Line subtotal</strong>
              <div>{formatMoney(detail.lineSubTotal)}</div>
            </div>
            <div>
              <strong>Tax total</strong>
              <div>{formatMoney(detail.taxTotal)}</div>
            </div>
            <div>
              <strong>Shipping</strong>
              <div>{formatMoney(detail.shippingCharge)}</div>
            </div>
            <div>
              <strong>Other charges</strong>
              <div>{formatMoney(detail.otherCharges)}</div>
            </div>
            <div>
              <strong>Round off</strong>
              <div>{formatMoney(detail.roundOff)}</div>
            </div>
            <div>
              <strong>Invoice total</strong>
              <div>{formatMoney(detail.invoiceTotal)}</div>
            </div>
            <div>
              <strong>Created</strong>
              <div>{formatDate(detail.createdAt)}</div>
            </div>
          </div>
          <div className={styles.linesTitle}>Products on this invoice</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Barcode</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Inventory ID</th>
                </tr>
              </thead>
              <tbody>
                {(detail.lines ?? []).map((line) => (
                  <tr key={`${line.lineIndex}-${line.inventoryId ?? ''}`}>
                    <td>{line.lineIndex + 1}</td>
                    <td>{line.name}</td>
                    <td>{line.barcode ?? '—'}</td>
                    <td>{line.count ?? '—'}</td>
                    <td>{formatMoney(line.costPrice ?? undefined)}</td>
                    <td
                      style={{
                        fontSize: '0.75rem',
                        wordBreak: 'break-all',
                        maxWidth: 140,
                      }}
                    >
                      {line.inventoryId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className={styles.pageBtn}
            style={{ marginTop: 12 }}
            onClick={() => setDetail(null)}
          >
            Close detail
          </button>
        </div>
      )}
    </div>
  );
}
