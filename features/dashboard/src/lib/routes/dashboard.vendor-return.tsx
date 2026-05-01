import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { inventoryApi } from '@inventory-platform/api';
import type {
  InventoryItem,
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceSummary,
  VendorResponse,
} from '@inventory-platform/types';
import { VendorReturnHistoryList } from '@inventory-platform/ui';
import { useNotify } from '@inventory-platform/store';
import refundStyles from './dashboard.refund.module.css';
import styles from './dashboard.vendor-return.module.css';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function meta() {
  return [
    { title: 'Return to vendor - StockKart' },
    {
      name: 'description',
      content: 'Return stock against supplier purchase invoices',
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

function formatHsnSac(item: InventoryItem | undefined): string {
  if (!item) return '—';
  const hsn = item.hsn?.trim();
  const sac = item.sac?.trim();
  if (hsn && sac) return `${hsn} / ${sac}`;
  return hsn || sac || '—';
}

/** Same factor semantics as VendorPurchaseReturnService.getDisplayToBaseFactor (pack size → base). */
function getDisplayToBaseFactor(inv: InventoryItem | undefined): number {
  const f = inv?.unitConversions?.factor;
  if (typeof f === 'number' && f > 0 && Number.isFinite(f)) return f;
  return 1;
}

/**
 * Max return in base units: when both exist, use the lesser of currentBaseCount and
 * (currentCount × pack factor), so caps match “stock (sell)” as well as backend stock.
 */
function maxReturnableBaseUnits(
  inv: InventoryItem | undefined,
  lineCount: number | null | undefined
): number {
  if (!inv) {
    return typeof lineCount === 'number' && lineCount > 0 ? lineCount : 0;
  }

  const factor = getDisplayToBaseFactor(inv);

  let fromSellCount: number | null = null;
  if (
    typeof inv.currentCount === 'number' &&
    Number.isFinite(inv.currentCount)
  ) {
    fromSellCount = Math.max(
      0,
      Math.round(Number(inv.currentCount) * factor)
    );
  }

  let fromStoredBase: number | null = null;
  if (
    typeof inv.currentBaseCount === 'number' &&
    Number.isFinite(inv.currentBaseCount) &&
    inv.currentBaseCount >= 0
  ) {
    fromStoredBase = Math.floor(inv.currentBaseCount);
  }

  if (fromSellCount != null && fromStoredBase != null) {
    return Math.min(fromSellCount, fromStoredBase);
  }
  if (fromSellCount != null) return fromSellCount;
  if (fromStoredBase != null) return fromStoredBase;
  if (typeof lineCount === 'number' && lineCount > 0) return lineCount;
  return 0;
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

function applySummaryFilters(
  rows: VendorPurchaseInvoiceSummary[],
  invoiceNo: string,
  vendorName: string
): VendorPurchaseInvoiceSummary[] {
  const invL = invoiceNo.trim().toLowerCase();
  const venL = vendorName.trim().toLowerCase();
  let out = rows;
  if (invL) {
    out = out.filter((r) =>
      (r.invoiceNo || '').toLowerCase().includes(invL)
    );
  }
  if (venL) {
    out = out.filter((r) =>
      (r.vendorName || '').toLowerCase().includes(venL)
    );
  }
  return out;
}

/** Pick regex sent to invoice list API: strongest discriminator first. */
function buildInvoiceSearchPattern(
  invoiceNo: string,
  vendorName: string,
  productOrBarcode: string
): string {
  const inv = invoiceNo.trim();
  const prod = productOrBarcode.trim();
  const ven = vendorName.trim();
  if (inv) return escapeRegExp(inv);
  if (prod) return escapeRegExp(prod);
  return escapeRegExp(ven);
}

export default function VendorReturnPage() {
  const location = useLocation();
  const state = location.state as { prefillVendor?: VendorResponse } | null;

  const { success, error: notifyError } = useNotify;
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [returnRecording, setReturnRecording] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [productOrBarcode, setProductOrBarcode] = useState('');

  const [invoices, setInvoices] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [selected, setSelected] = useState<VendorPurchaseInvoiceSummary | null>(
    null
  );
  const [detail, setDetail] = useState<VendorPurchaseInvoiceDetail | null>(null);
  const [inventoryById, setInventoryById] = useState<
    Record<string, InventoryItem>
  >({});
  const [qtyByInventoryId, setQtyByInventoryId] = useState<
    Record<string, string>
  >({});
  const [reason, setReason] = useState('');
  const [detailBusy, setDetailBusy] = useState(false);
  const [hydrateBusy, setHydrateBusy] = useState(false);

  useEffect(() => {
    if (!state?.prefillVendor) return;
    const v = state.prefillVendor.name?.trim();
    if (v) setVendorName(v);
  }, [state]);

  const resetSelection = () => {
    setSelected(null);
    setDetail(null);
    setQtyByInventoryId({});
    setReason('');
  };

  const hydrateInventoryForDetail = useCallback(
    async (d: VendorPurchaseInvoiceDetail, options?: { bypassCache?: boolean }) => {
      const ids = Array.from(
        new Set(
          (d.lines ?? [])
            .map((line) => line.inventoryId)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (ids.length === 0) return;

      const bypass = options?.bypassCache === true;
      const idsToFetch = bypass ? ids : ids.filter((id) => !inventoryById[id]);
      if (idsToFetch.length === 0) return;

      setHydrateBusy(true);
      try {
        const fetched = await inventoryApi.getByIds(idsToFetch);
        setInventoryById((prev) => {
          const next = { ...prev };
          for (let i = 0; i < fetched.length; i += 1) {
            const item = fetched[i];
            const requestedId = idsToFetch[i];
            const identity = readInventoryIdentity(item);
            if (requestedId) next[requestedId] = item;
            else if (identity) next[identity] = item;
          }
          return next;
        });
      } catch {
        notifyError('Some inventory rows could not be loaded.');
      } finally {
        setHydrateBusy(false);
      }
    },
    [inventoryById, notifyError]
  );

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const inv = invoiceNo.trim();
    const ven = vendorName.trim();
    const prod = productOrBarcode.trim();
    if (!inv && !ven && !prod) {
      notifyError('Enter invoice number, vendor name, or a product/barcode hint.');
      return;
    }

    setSearchLoading(true);
    resetSelection();
    try {
      const q = buildInvoiceSearchPattern(inv, ven, prod);
      const response = await inventoryApi.listVendorPurchaseInvoices(
        0,
        100,
        q
      );
      const rows = applySummaryFilters(response.invoices ?? [], inv, ven);
      setInvoices(rows);
      if (rows.length === 0) {
        notifyError(
          'No purchase invoices matched. Try broader text or see Regex tips under History → Purchase history.'
        );
      }
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to search invoices.'
      );
      setInvoices([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectInvoice = async (inv: VendorPurchaseInvoiceSummary) => {
    setSelected(inv);
    setQtyByInventoryId({});
    setReason('');
    setDetail(null);
    setDetailBusy(true);
    try {
      const d = await inventoryApi.getVendorPurchaseInvoice(inv.id);
      setDetail(d);
      void hydrateInventoryForDetail(d);
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load invoice details.'
      );
    } finally {
      setDetailBusy(false);
    }
  };

  const stockLines = useMemo(
    () => (detail?.lines ?? []).filter((l) => l.inventoryId != null),
    [detail]
  );

  const submitReturn = async () => {
    if (!detail) {
      notifyError('Select an invoice first.');
      return;
    }

    const items: { inventoryId: string; baseQuantityReturned: number }[] = [];
    for (const line of stockLines) {
      const id = line.inventoryId!;
      const raw = (qtyByInventoryId[id] ?? '').trim();
      if (raw === '') continue;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        notifyError(`Invalid quantity for “${line.name}”.`);
        return;
      }
      const invRow = inventoryById[id];
      const max = maxReturnableBaseUnits(invRow, line.count);
      if (max <= 0) {
        notifyError(`No stock on hand for “${line.name}”.`);
        return;
      }
      if (n > max) {
        notifyError(
          `Return qty for “${line.name}” cannot exceed ${max} (base units).`
        );
        return;
      }
      items.push({ inventoryId: id, baseQuantityReturned: n });
    }

    if (items.length === 0) {
      notifyError(
        'Enter a return quantity in base units for at least one line.'
      );
      return;
    }

    setReturnRecording(true);
    try {
      const res = await inventoryApi.createVendorPurchaseReturn({
        vendorPurchaseInvoiceId: detail.id,
        items,
        reason: reason.trim() || undefined,
      });
      success(
        `Return recorded. Supplier credit note: ${res.supplierCreditNoteNo}. Amount: ${formatMoney(res.returnAmount)}`
      );
      setHistoryRefreshTrigger((t) => t + 1);
      resetSelection();
      setInvoices([]);
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to record vendor return.'
      );
    } finally {
      setReturnRecording(false);
    }
  };

  const vendorHint =
    hydrateBusy || detailBusy ? 'Loading invoice…' : null;

  return (
    <div className={refundStyles.page}>
      <div className={refundStyles.header}>
        <h2 className={refundStyles.title}>Return stock to supplier</h2>
        <p className={refundStyles.subtitle}>
          Find a vendor purchase invoice, then enter return quantities in base units
          (same basis as inventory). Credit notes appear in GSTR‑2 CDNR / CDNUR for
          the return month when applicable.
        </p>
      </div>

      <div className={refundStyles.tabs}>
        <button
          type="button"
          className={`${refundStyles.tab} ${
            activeTab === 'process' ? refundStyles.activeTab : ''
          }`}
          onClick={() => setActiveTab('process')}
        >
          Process return
        </button>
        <button
          type="button"
          className={`${refundStyles.tab} ${
            activeTab === 'history' ? refundStyles.activeTab : ''
          }`}
          onClick={() => setActiveTab('history')}
        >
          Return history
        </button>
      </div>

      {activeTab === 'history' && (
        <div className={refundStyles.content}>
          <div className={refundStyles.historySection}>
            <h3 className={refundStyles.sectionTitle}>Supplier return history</h3>
            <VendorReturnHistoryList refreshTrigger={historyRefreshTrigger} />
          </div>
        </div>
      )}

      {activeTab === 'process' && (
      <div className={refundStyles.content}>
        <div className={refundStyles.searchSection}>
          <h3 className={refundStyles.sectionTitle}>Search purchase invoice</h3>
          <p className={styles.hint}>
            Search uses the same rules as History → Purchase history (Java regex against invoice
            number, supplier name, and line names/barcodes). Enter at least one field.
            When invoice number is set, any product/barcode field is omitted from the
            server search—use Vendor invoices for Regex across multiple cues.
          </p>
          <form onSubmit={handleSearch} className={refundStyles.searchForm}>
            <div className={refundStyles.formRow}>
              <div className={refundStyles.formGroup}>
                <label htmlFor="vendorName" className={refundStyles.label}>
                  Vendor name
                </label>
                <input
                  id="vendorName"
                  type="text"
                  className={refundStyles.input}
                  placeholder="Supplier name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  disabled={searchLoading}
                />
              </div>
              <div className={refundStyles.formGroup}>
                <label htmlFor="invoiceNo" className={refundStyles.label}>
                  Invoice number
                </label>
                <input
                  id="invoiceNo"
                  type="text"
                  className={refundStyles.input}
                  placeholder="Purchase invoice no."
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  disabled={searchLoading}
                />
              </div>
              <div className={refundStyles.formGroup}>
                <label htmlFor="productHint" className={refundStyles.label}>
                  Product / barcode
                </label>
                <input
                  id="productHint"
                  type="text"
                  className={refundStyles.input}
                  placeholder="Matches line names or barcode"
                  value={productOrBarcode}
                  onChange={(e) => setProductOrBarcode(e.target.value)}
                  disabled={searchLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              className={refundStyles.searchBtn}
              disabled={searchLoading}
            >
              {searchLoading ? 'Searching…' : 'Search invoices'}
            </button>
          </form>
        </div>

        {vendorHint ? (
          <p className={styles.hint} role="status">
            {vendorHint}
          </p>
        ) : null}

        {invoices.length > 0 && (
          <div className={refundStyles.purchasesSection}>
            <h3 className={refundStyles.sectionTitle}>Select invoice</h3>
            <div className={refundStyles.purchasesList}>
              {invoices.map((inv) => (
                <div key={inv.id}>
                  <div
                    className={`${refundStyles.purchaseCard} ${
                      selected?.id === inv.id ? refundStyles.selectedPurchase : ''
                    }`}
                    onClick={() => void selectInvoice(inv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        void selectInvoice(inv);
                      }
                    }}
                  >
                    <div className={refundStyles.purchaseHeader}>
                      <div>
                        <strong>Invoice:</strong> {inv.invoiceNo}
                        {inv.synthetic ? (
                          <span style={{ marginLeft: 8, opacity: 0.85 }}>
                            {' '}
                            (auto no.)
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <strong>Date:</strong> {formatDate(inv.invoiceDate)}
                      </div>
                    </div>
                    <div className={refundStyles.purchaseDetails}>
                      <div>
                        <strong>Vendor:</strong>{' '}
                        {inv.vendorName?.trim() || '—'}
                      </div>
                      <div>
                        <strong>Lines:</strong> {inv.lineCount}
                      </div>
                      <div>
                        <strong>Total:</strong>{' '}
                        {formatMoney(inv.invoiceTotal)}
                      </div>
                    </div>
                  </div>

                  {selected?.id === inv.id && detail && (
                    <div className={refundStyles.refundSection}>
                      <h3 className={refundStyles.sectionTitle}>
                        Lines — return qty (base units)
                      </h3>
                      <div className={refundStyles.purchaseInfo}>
                        <div>
                          <strong>Invoice:</strong> {detail.invoiceNo}
                        </div>
                        <div>
                          <strong>Vendor:</strong>{' '}
                          {detail.vendorName?.trim() || '—'}
                        </div>
                        <div>
                          <strong>Dated:</strong>{' '}
                          {formatDate(detail.invoiceDate)}
                        </div>
                      </div>

                      {stockLines.length === 0 ? (
                        <p className={styles.hint}>No inventoried lines on this bill.</p>
                      ) : (
                        <>
                          {hydrateBusy ? (
                            <p className={styles.hint} role="status">
                              Loading batch, barcode, pricing, and GST from inventory…
                            </p>
                          ) : (
                            <p className={styles.hint}>
                              Barcode, batch, HSN/SAC, and tax rates come from the stock
                              lot; cost is invoice line price or inventory cost.{' '}
                              <strong>Max return</strong> is capped by both base stock and
                              sell stock (current count × pack factor from the lot), whichever
                              is smaller.
                            </p>
                          )}
                          <div
                            className={`${refundStyles.itemsTable} ${styles.detailsTableWrap}`}
                          >
                            <table className={styles.detailsTable}>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Product</th>
                                  <th>Company</th>
                                  <th>HSN / SAC</th>
                                  <th>Barcode</th>
                                  <th>Batch</th>
                                  <th>Expiry</th>
                                  <th className={styles.numericTh}>Qty (bill)</th>
                                  <th className={styles.numericTh}>Cost</th>
                                  <th className={styles.numericTh}>MRP</th>
                                  <th className={styles.numericTh}>PTR</th>
                                  <th>GST %</th>
                                  <th className={styles.numericTh}>
                                    Stock (sell)
                                  </th>
                                  <th className={styles.numericTh}>Stock (base)</th>
                                  <th className={styles.numericTh}>Max return</th>
                                  <th className={styles.numericTh}>
                                    Return qty (base)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockLines.map((line) => {
                                  const id = line.inventoryId!;
                                  const invRow = inventoryById[id];
                                  const max = maxReturnableBaseUnits(
                                    invRow,
                                    line.count
                                  );
                                  const barcode =
                                    line.barcode ?? invRow?.barcode ?? null;
                                  return (
                                    <tr key={`${line.lineIndex}-${id}`}>
                                      <td>{line.lineIndex + 1}</td>
                                      <td>
                                        <div>{line.name}</div>
                                        {invRow?.baseUnit?.trim() ? (
                                          <div className={styles.baseUnitNote}>
                                            Base unit: {invRow.baseUnit.trim()}
                                          </div>
                                        ) : null}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {invRow?.companyName?.trim() || '—'}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {formatHsnSac(invRow)}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {barcode ?? '—'}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {invRow?.batchNo?.trim() || '—'}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {formatCompactDate(invRow?.expiryDate)}
                                      </td>
                                      <td className={styles.numeric}>
                                        {line.count ?? '—'}
                                      </td>
                                      <td className={styles.numeric}>
                                        {formatMoney(line.costPrice ?? invRow?.costPrice)}
                                      </td>
                                      <td className={styles.numeric}>
                                        {formatMoney(invRow?.maximumRetailPrice)}
                                      </td>
                                      <td className={styles.numeric}>
                                        {formatMoney(invRow?.priceToRetail)}
                                      </td>
                                      <td className={styles.cellMuted}>
                                        {formatGst(invRow)}
                                      </td>
                                      <td className={styles.numeric}>
                                        {typeof invRow?.currentCount === 'number'
                                          ? invRow.currentCount
                                          : '—'}
                                      </td>
                                      <td className={styles.numeric}>
                                        {typeof invRow?.currentBaseCount ===
                                        'number'
                                          ? invRow.currentBaseCount
                                          : '—'}
                                      </td>
                                      <td className={styles.numeric}>
                                        {max > 0 ? max : '—'}
                                      </td>
                                      <td className={styles.numeric}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={max > 0 ? max : undefined}
                                          className={refundStyles.quantityInput}
                                          inputMode="numeric"
                                          placeholder="0"
                                          disabled={
                                            returnRecording ||
                                            detailBusy ||
                                            max <= 0
                                          }
                                          value={qtyByInventoryId[id] ?? ''}
                                          onChange={(ev) =>
                                            setQtyByInventoryId((prev) => ({
                                              ...prev,
                                              [id]: ev.target.value,
                                            }))
                                          }
                                          aria-label={`Return quantity base units for ${line.name}`}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      <label className={styles.reasonLabel}>
                        <span>Reason (optional)</span>
                        <textarea
                          className={styles.reasonArea}
                          rows={2}
                          disabled={returnRecording}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. Damaged batch, shortage"
                        />
                      </label>

                      <button
                        type="button"
                        className={refundStyles.processRefundBtn}
                        disabled={
                          returnRecording ||
                          stockLines.length === 0 ||
                          detailBusy
                        }
                        onClick={() => void submitReturn()}
                      >
                        {returnRecording
                          ? 'Recording…'
                          : 'Record return to supplier'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
