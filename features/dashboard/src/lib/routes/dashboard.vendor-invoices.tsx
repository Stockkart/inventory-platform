import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { inventoryApi } from '@inventory-platform/api';
import type {
  InventoryItem,
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceSummary,
} from '@inventory-platform/types';
import styles from './dashboard.vendor-invoices.module.css';
import {
  PaginationBar,
  isVendorReturnEnabled,
  HistoryListSummary,
  historyRecordListStyles,
} from '@inventory-platform/ui';
import type { HistoryFilters } from '@inventory-platform/ui';
import {
  hasActiveHistoryFilters,
  isDateInRange,
  buildVendorInvoiceSearchQuery,
  paginateLocal,
  matchesRegexField,
} from '@inventory-platform/ui';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/store';

const recordStyles = historyRecordListStyles;

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
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatGst(item: InventoryItem | undefined): string {
  if (!item) return '—';
  const sgst = item.sgst?.trim();
  const cgst = item.cgst?.trim();
  if (!sgst && !cgst) return '—';
  return `SGST ${sgst || '0'} + CGST ${cgst || '0'}`;
}

function readInventoryIdentity(item: InventoryItem): string | null {
  const maybeId = (item as InventoryItem & { id?: string | null }).id;
  if (typeof maybeId === 'string' && maybeId.trim() !== '') {
    return maybeId.trim();
  }
  if (typeof item.lotId === 'string' && item.lotId.trim() !== '') {
    return item.lotId.trim();
  }
  return null;
}

function vendorDisplay(row: {
  vendorName?: string | null;
}): string {
  const n = row.vendorName?.trim();
  if (n) return n;
  return 'Unknown vendor';
}

function InvoiceExpandedBody({
  detail,
  inventoryById,
  inventoryLoading,
  inventoryWarning,
}: {
  detail: VendorPurchaseInvoiceDetail;
  inventoryById: Record<string, InventoryItem>;
  inventoryLoading: boolean;
  inventoryWarning?: string;
}) {
  const totals = useMemo(
    () => [
      {
        label: 'Line subtotal',
        value: formatMoney(detail.lineSubTotal),
      },
      { label: 'Tax total', value: formatMoney(detail.taxTotal) },
      { label: 'Shipping', value: formatMoney(detail.shippingCharge) },
      { label: 'Other charges', value: formatMoney(detail.otherCharges) },
      {
        label: 'Overall discount',
        value: formatMoney(detail.overallDiscount),
      },
      { label: 'Round off', value: formatMoney(detail.roundOff) },
      { label: 'Invoice total', value: formatMoney(detail.invoiceTotal) },
    ],
    [detail]
  );

  return (
    <div className={styles.expandedInner}>
      <div className={styles.expandedHeader}>
        <div>
          <h3 className={styles.expandedTitle}>
            {detail.invoiceNo}
            {detail.synthetic ? (
              <span className={styles.badgeMuted}>Auto invoice no.</span>
            ) : null}
          </h3>
          <p className={styles.expandedVendor}>{vendorDisplay(detail)}</p>
          {detail.invoiceDate ? (
            <p className={styles.expandedMeta}>
              Dated{' '}
              <time dateTime={detail.invoiceDate}>
                {formatDate(detail.invoiceDate)}
              </time>
            </p>
          ) : null}
        </div>
        {detail.legacyLotId ? (
          <p className={styles.legacyHint}>
            Legacy reference:{' '}
            <code className={styles.mono}>{detail.legacyLotId}</code>
          </p>
        ) : null}
      </div>

      <dl className={styles.amountGrid}>
        {totals.map(({ label, value }) => (
          <div key={label} className={styles.amountItem}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className={styles.amountItem}>
          <dt>Recorded</dt>
          <dd>{formatDate(detail.createdAt)}</dd>
        </div>
      </dl>

      <div className={styles.linesSection}>
        <h4 className={styles.linesHeading}>Products on this invoice</h4>
        {inventoryLoading ? (
          <p className={styles.linesStatus}>Loading inventory details…</p>
        ) : null}
        {inventoryWarning ? (
          <p className={styles.linesWarning}>{inventoryWarning}</p>
        ) : null}
        <div className={styles.linesTableWrap}>
          <table className={styles.linesTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Company</th>
                <th>Barcode</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>MRP</th>
                <th>PTR</th>
                <th>GST</th>
                <th>Current stock</th>
              </tr>
            </thead>
            <tbody>
              {(detail.lines ?? []).map((line) => {
                const inv =
                  line.inventoryId != null
                    ? inventoryById[line.inventoryId] ?? undefined
                    : undefined;
                return (
                  <tr key={`${line.lineIndex}-${line.inventoryId ?? ''}`}>
                    <td className={styles.linesNum}>{line.lineIndex + 1}</td>
                    <td>{line.name}</td>
                    <td className={styles.linesMuted}>{inv?.companyName ?? '—'}</td>
                    <td className={styles.linesMuted}>
                      {line.barcode ?? inv?.barcode ?? '—'}
                    </td>
                    <td className={styles.linesMuted}>{inv?.batchNo ?? '—'}</td>
                    <td className={styles.linesMuted}>
                      {formatCompactDate(inv?.expiryDate)}
                    </td>
                    <td>{line.count ?? '—'}</td>
                    <td className={styles.linesMoney}>
                      {formatMoney(line.costPrice ?? inv?.costPrice)}
                    </td>
                    <td className={styles.linesMoney}>
                      {formatMoney(inv?.maximumRetailPrice)}
                    </td>
                    <td className={styles.linesMoney}>
                      {formatMoney(inv?.priceToRetail)}
                    </td>
                    <td className={styles.linesMuted}>{formatGst(inv)}</td>
                    <td className={styles.linesMoney}>
                      {inv?.currentCount ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export type VendorInvoicesPageProps = {
  embedded?: boolean;
  filters?: HistoryFilters;
};

const FILTER_FETCH_SIZE = 100;

export default function VendorInvoicesPage({
  embedded = false,
  filters,
}: VendorInvoicesPageProps) {
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
  );
  const vendorReturnEnabled = isVendorReturnEnabled(shopCapabilities);

  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [listQuery, setListQuery] = useState('');
  const filtering =
    filters != null && hasActiveHistoryFilters(filters, 'purchaseHistory');
  const [filterPage, setFilterPage] = useState(1);
  const embeddedPageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [invoices, setInvoices] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<
    Record<string, VendorPurchaseInvoiceDetail>
  >({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [inventoryById, setInventoryById] = useState<Record<string, InventoryItem>>(
    {}
  );
  const [inventoryLoadingByInvoice, setInventoryLoadingByInvoice] = useState<
    Record<string, boolean>
  >({});
  const [inventoryWarningByInvoice, setInventoryWarningByInvoice] = useState<
    Record<string, string>
  >({});
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setFilterPage(1);
    setPage(0);
  }, [filters]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (filtering && filters) {
        const q = buildVendorInvoiceSearchQuery(filters);
        const res = await inventoryApi.listVendorPurchaseInvoices(
          0,
          FILTER_FETCH_SIZE,
          q
        );
        let rows = res.invoices ?? [];
        rows = rows.filter((inv) =>
          isDateInRange(inv.invoiceDate, filters.dateFrom, filters.dateTo)
        );
        rows = rows.filter((inv) =>
          matchesRegexField(filters.invoiceNo, inv.invoiceNo)
        );
        rows = rows.filter((inv) =>
          matchesRegexField(filters.vendor, vendorDisplay(inv))
        );
        const paged = paginateLocal(rows, filterPage, embeddedPageSize);
        setFilteredTotal(paged.total);
        setInvoices(paged.slice);
        setTotalPages(paged.totalPages);
        setTotalItems(paged.total);
      } else if (embedded) {
        const res = await inventoryApi.listVendorPurchaseInvoices(
          page,
          embeddedPageSize,
          listQuery || undefined
        );
        setInvoices(res.invoices ?? []);
        setTotalPages(res.page?.totalPages ?? 0);
        setTotalItems(res.page?.totalItems ?? 0);
        setFilteredTotal(0);
      } else {
        const res = await inventoryApi.listVendorPurchaseInvoices(
          page,
          size,
          listQuery || undefined
        );
        setInvoices(res.invoices ?? []);
        setTotalPages(res.page?.totalPages ?? 0);
        setTotalItems(res.page?.totalItems ?? 0);
        setFilteredTotal(0);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load vendor invoices'
      );
      setInvoices([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [embedded, filterPage, filtering, filters, listQuery, page, size]);

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setExpandedId(null);
  }, [page, filterPage]);

  const runSearch = useCallback(() => {
    const q = searchInput.trim();
    setPage(0);
    setListQuery(q);
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setPage(0);
    setListQuery('');
  }, []);

  const hydrateInventoryForInvoice = useCallback(
    async (
      invoiceId: string,
      detail: VendorPurchaseInvoiceDetail,
      options?: { bypassCache?: boolean }
    ) => {
      const ids = Array.from(
        new Set(
          (detail.lines ?? [])
            .map((line) => line.inventoryId)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (ids.length === 0) return;

      const bypass = options?.bypassCache === true;
      const idsToFetch = bypass
        ? ids
        : ids.filter((id) => !inventoryById[id]);
      if (idsToFetch.length === 0) return;

      setInventoryLoadingByInvoice((prev) => ({ ...prev, [invoiceId]: true }));
      setInventoryWarningByInvoice((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });

      let failed = 0;
      let fetched: InventoryItem[] = [];
      try {
        fetched = await inventoryApi.getByIds(idsToFetch);
      } catch {
        failed = idsToFetch.length;
      }

      if (fetched.length > 0) {
        setInventoryById((prev) => {
          const next = { ...prev };
          for (let i = 0; i < fetched.length; i += 1) {
            const item = fetched[i];
            const requestedId = idsToFetch[i];
            const identity = readInventoryIdentity(item);
            if (requestedId) {
              // Primary mapping: preserve requested order from bulk response.
              next[requestedId] = item;
            } else if (identity) {
              next[identity] = item;
            }
          }
          return next;
        });
      }

      if (failed === 0) {
        const matchedCount = Math.min(idsToFetch.length, fetched.length);
        failed = idsToFetch.length - matchedCount;
      }

      if (failed > 0) {
        setInventoryWarningByInvoice((prev) => ({
          ...prev,
          [invoiceId]: `${failed} line item(s) could not load inventory details.`,
        }));
      }
      setInventoryLoadingByInvoice((prev) => ({ ...prev, [invoiceId]: false }));
    },
    [inventoryById]
  );

  const toggleExpanded = async (inv: VendorPurchaseInvoiceSummary) => {
    const id = inv.id;
    setError(null);

    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (detailsById[id]) {
      void hydrateInventoryForInvoice(id, detailsById[id]);
      return;
    }

    setFetchingId(id);
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const d = await inventoryApi.getVendorPurchaseInvoice(id);
      setDetailsById((prev) => ({ ...prev, [id]: d }));
      void hydrateInventoryForInvoice(id, d);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Failed to load invoice details';
      setRowError((prev) => ({ ...prev, [id]: msg }));
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className={embedded ? recordStyles.container : styles.page}>
      {!embedded ? (
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Vendor purchase invoices</h1>
          <p className={styles.heroSubtitle}>
            Supplier bills linked to stock-in registrations. Search by product, barcode,
            invoice number, or vendor name. Expand a row to see line items and
            totals.
            {vendorReturnEnabled ? (
              <>
                {' '}
                To return stock to a supplier, use{' '}
                <strong>Return to vendor</strong> under Products &amp; Sales.
              </>
            ) : null}
          </p>
        </header>
      ) : null}

      {error && (
        <div className={styles.alertError} role="alert">
          {error}
        </div>
      )}

      <div className={embedded ? undefined : styles.surface}>
        {!embedded && (
          <div className={styles.searchBar}>
            <input
              type="search"
              className={styles.searchInput}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
              placeholder="Product, barcode, invoice no, or vendor"
              aria-label="Search invoices by product, barcode, invoice number, or vendor name"
            />
            <button type="button" className={styles.searchBtn} onClick={runSearch}>
              Search
            </button>
            {listQuery ? (
              <button
                type="button"
                className={styles.searchBtnSecondary}
                onClick={clearSearch}
              >
                Clear
              </button>
            ) : null}
            <p className={styles.searchHint}>
              Same pattern is tried against invoice number, vendor name, and each line’s
              product name and barcode (case-insensitive). Examples:{' '}
              <code>paracetamol|dolo</code>, <code>INV-712</code>, <code>^HIMP</code>.
              Invalid patterns return an error from the server.
            </p>
          </div>
        )}
        {loading ? (
          <div className={embedded ? recordStyles.loading : styles.stateMuted}>
            Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className={embedded ? recordStyles.emptyState : styles.stateMuted}>
            {filtering || listQuery
              ? 'No invoices match this search. Try a different pattern or clear the filter.'
              : 'No vendor invoices yet. When you register stock with invoice details, they appear here.'}
          </div>
        ) : embedded ? (
          <>
            <HistoryListSummary
              page={filtering ? filterPage : page + 1}
              limit={embeddedPageSize}
              total={filtering ? filteredTotal : totalItems}
              filtered={filtering}
              label="purchases"
            />
            <div className={recordStyles.list}>
              {invoices.map((inv) => {
                const isOpen = expandedId === inv.id;
                const detail = detailsById[inv.id];
                const rowBusy = fetchingId === inv.id;
                const err = rowError[inv.id];

                return (
                  <div key={inv.id} className={recordStyles.recordCard}>
                    <div className={recordStyles.recordHeader}>
                      <div>
                        <strong>Invoice:</strong> {inv.invoiceNo}
                        {inv.synthetic ? (
                          <span className={styles.badge}> Auto</span>
                        ) : null}
                      </div>
                      <div className={recordStyles.recordActions}>
                        <div>
                          <strong>Date:</strong> {formatDateShort(inv.invoiceDate)}
                        </div>
                        <button
                          type="button"
                          className={recordStyles.expandBtn}
                          onClick={() => toggleExpanded(inv)}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? 'Hide details' : 'View details'}
                        </button>
                      </div>
                    </div>
                    <div className={recordStyles.recordDetails}>
                      <div>
                        <strong>Vendor:</strong> {vendorDisplay(inv)}
                      </div>
                      <div>
                        <strong>Lines:</strong> {inv.lineCount}
                      </div>
                      <div>
                        <strong>Total:</strong> {formatMoney(inv.invoiceTotal)}
                      </div>
                    </div>
                    {isOpen ? (
                      <div className={recordStyles.breakdownWrap}>
                        {rowBusy && !detail ? (
                          <div className={styles.panelLoading}>Loading details…</div>
                        ) : null}
                        {err ? (
                          <div className={styles.panelError} role="alert">
                            {err}
                          </div>
                        ) : null}
                        {detail ? (
                          <InvoiceExpandedBody
                            detail={detail}
                            inventoryById={inventoryById}
                            inventoryLoading={
                              inventoryLoadingByInvoice[inv.id] === true
                            }
                            inventoryWarning={inventoryWarningByInvoice[inv.id]}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <PaginationBar
              page={filtering ? filterPage - 1 : page}
              totalPages={totalPages}
              onPageChange={(p) => {
                if (filtering) setFilterPage(p + 1);
                else setPage(p);
              }}
              aria-label="Invoice pages"
            />
          </>
        ) : (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.sheet}>
                <thead>
                  <tr>
                    <th scope="col">Invoice</th>
                    <th scope="col">Vendor</th>
                    <th scope="col">Date</th>
                    <th scope="col" className={styles.numericCol}>
                      Lines
                    </th>
                    <th scope="col" className={styles.numericCol}>
                      Total
                    </th>
                    <th scope="col" className={styles.actionCol}>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isOpen = expandedId === inv.id;
                    const detail = detailsById[inv.id];
                    const rowBusy = fetchingId === inv.id;
                    const err = rowError[inv.id];

                    return (
                      <Fragment key={inv.id}>
                        <tr
                          className={
                            isOpen
                              ? `${styles.dataRow} ${styles.dataRowOpen}`
                              : styles.dataRow
                          }
                        >
                          <td className={styles.cellInvoice}>
                            <span className={styles.invoiceNo}>
                              {inv.invoiceNo}
                            </span>
                            {inv.synthetic ? (
                              <span className={styles.badge}>Auto</span>
                            ) : null}
                          </td>
                          <td className={styles.cellStrong}>
                            {vendorDisplay(inv)}
                          </td>
                          <td className={styles.cellMuted}>
                            {formatDateShort(inv.invoiceDate)}
                          </td>
                          <td className={`${styles.numericCol} ${styles.cellMuted}`}>
                            {inv.lineCount}
                          </td>
                          <td
                            className={`${styles.numericCol} ${styles.cellMoney}`}
                          >
                            {formatMoney(inv.invoiceTotal)}
                          </td>
                          <td className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.expandControl}
                              onClick={() => toggleExpanded(inv)}
                              aria-expanded={isOpen}
                              aria-controls={`invoice-panel-${inv.id}`}
                              id={`invoice-trigger-${inv.id}`}
                            >
                              <span className={styles.expandLabel}>
                                {isOpen ? 'Hide' : 'View'}
                              </span>
                              <svg
                                className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className={styles.detailRow}>
                            <td colSpan={6}>
                              <div
                                id={`invoice-panel-${inv.id}`}
                                role="region"
                                aria-labelledby={`invoice-trigger-${inv.id}`}
                                className={styles.panel}
                              >
                                {rowBusy && !detail ? (
                                  <div className={styles.panelLoading}>
                                    Loading details…
                                  </div>
                                ) : null}
                                {err ? (
                                  <div className={styles.panelError} role="alert">
                                    {err}
                                  </div>
                                ) : null}
                                {detail ? (
                                  <InvoiceExpandedBody
                                    detail={detail}
                                    inventoryById={inventoryById}
                                    inventoryLoading={
                                      inventoryLoadingByInvoice[inv.id] === true
                                    }
                                    inventoryWarning={inventoryWarningByInvoice[inv.id]}
                                  />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={filtering ? filterPage - 1 : page}
              totalPages={totalPages}
              onPageChange={(p) => {
                if (filtering) setFilterPage(p + 1);
                else setPage(p);
              }}
              aria-label="Invoice pages"
            />
          </>
        )}
      </div>
    </div>
  );
}
