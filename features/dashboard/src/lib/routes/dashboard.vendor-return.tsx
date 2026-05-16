import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { inventoryApi } from '@inventory-platform/api';
import type {
  InventoryItem,
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceSummary,
  VendorResponse,
} from '@inventory-platform/types';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/types';
import {
  PaginationBar,
  PaymentMethodSplit,
  VendorReturnHistoryList,
  emptyPaymentSplit,
  isCreditMethod,
  roundMoney,
  validatePaymentSplit,
} from '@inventory-platform/ui';
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

/**
 * Max units the cashier can enter in the same “sale” / POS unit as {@link InventoryItem.currentCount}.
 * Mirrors the backend cap in base units, converted back to selling units for the UI.
 */
function maxReturnableSellUnits(
  inv: InventoryItem | undefined,
  lineCount: number | null | undefined
): number {
  const maxBase = maxReturnableBaseUnits(inv, lineCount);
  if (maxBase <= 0) {
    return 0;
  }
  const factor = Math.max(1, getDisplayToBaseFactor(inv));
  const maxByBase = Math.floor(maxBase / factor);
  if (
    inv &&
    typeof inv.currentCount === 'number' &&
    Number.isFinite(inv.currentCount)
  ) {
    const sellCap = Math.max(0, Math.floor(Number(inv.currentCount)));
    return Math.min(sellCap, maxByBase);
  }
  return maxByBase;
}

/** Convert sell-unit qty to canonical base qty for POST /vendor-purchase-returns. */
function sellUnitsToBaseQuantity(inv: InventoryItem | undefined, sellQty: number): number {
  const factor = getDisplayToBaseFactor(inv);
  const f =
    typeof factor === 'number' && factor > 0 && Number.isFinite(factor) ? factor : 1;
  return Math.round(sellQty * f);
}

/** On-hand qty in selling units (floor); matches the shelf figure used to cap returns. */
function currentSellQtyOnHand(inv: InventoryItem | undefined): number | null {
  if (
    !inv ||
    typeof inv.currentCount !== 'number' ||
    !Number.isFinite(inv.currentCount)
  ) {
    return null;
  }
  return Math.max(0, Math.floor(Number(inv.currentCount)));
}

function formatCurrentSellQtyDisplay(inv: InventoryItem | undefined): string {
  const q = currentSellQtyOnHand(inv);
  return q == null ? '—' : String(q);
}

function parseGstPct(rate: string | null | undefined): number {
  if (rate == null) return 0;
  const s = String(rate).trim().replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatGstRatesLabel(inv: InventoryItem | undefined): string {
  if (!inv) return '—';
  const cg = parseGstPct(inv.cgst);
  const sg = parseGstPct(inv.sgst);
  if (cg <= 0 && sg <= 0) {
    return inv.billingMode === 'BASIC' ? 'Basic' : '—';
  }
  if (cg > 0 && sg > 0) {
    return `CGST ${cg}% + SGST ${sg}%`;
  }
  if (cg > 0) return `CGST ${cg}%`;
  return `SGST ${sg}%`;
}

const roundMoney2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Mirrors backend vendor return valuation: PTS/cost × sell qty (ex-GST),
 * CGST/SGST computed on taxable ( VendorPurchaseReturnService ).
 */
function estimateDebitNoteLine(
  sellQtyReturned: number,
  unitCost: number | null | undefined,
  invRow: InventoryItem | undefined
): {
  taxable: number;
  cgst: number;
  sgst: number;
  total: number;
} | null {
  if (
    sellQtyReturned <= 0 ||
    unitCost == null ||
    !Number.isFinite(unitCost) ||
    unitCost < 0
  ) {
    return null;
  }
  const taxable = roundMoney2(sellQtyReturned * unitCost);
  const cgRate = parseGstPct(invRow?.cgst);
  const sgRate = parseGstPct(invRow?.sgst);
  if (cgRate <= 0 && sgRate <= 0) {
    return { taxable, cgst: 0, sgst: 0, total: taxable };
  }
  const cgst = roundMoney2((taxable * cgRate) / 100);
  const sgst = roundMoney2((taxable * sgRate) / 100);
  return {
    taxable,
    cgst,
    sgst,
    total: roundMoney2(taxable + cgst + sgst),
  };
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
  const [appliedInvoiceNo, setAppliedInvoiceNo] = useState('');
  const [appliedVendorName, setAppliedVendorName] = useState('');
  const [appliedProductOrBarcode, setAppliedProductOrBarcode] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>(() =>
    emptyPaymentSplit()
  );
  const [detailBusy, setDetailBusy] = useState(false);
  const [hydrateBusy, setHydrateBusy] = useState(false);

  useEffect(() => {
    if (!state?.prefillVendor) return;
    const v = state.prefillVendor.name?.trim();
    if (v) {
      setVendorName(v);
      setAppliedVendorName(v);
      setPage(0);
    }
  }, [state]);

  const resetSelection = () => {
    setSelected(null);
    setDetail(null);
    setQtyByInventoryId({});
    setReason('');
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
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

  const loadInvoices = useCallback(async () => {
    const inv = appliedInvoiceNo.trim();
    const ven = appliedVendorName.trim();
    const prod = appliedProductOrBarcode.trim();
    const hasFilter = Boolean(inv || ven || prod);

    setSearchLoading(true);
    try {
      const response = hasFilter
        ? await inventoryApi.listVendorPurchaseInvoices(
            page,
            pageSize,
            buildInvoiceSearchPattern(inv, ven, prod)
          )
        : await inventoryApi.listVendorPurchaseInvoices(page, pageSize);
      const rows = hasFilter
        ? applySummaryFilters(response.invoices ?? [], inv, ven)
        : (response.invoices ?? []);
      setInvoices(rows);
      setTotalPages(response.page?.totalPages ?? 0);
      setTotalItems(response.page?.totalItems ?? 0);
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load purchase invoices.'
      );
      setInvoices([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setSearchLoading(false);
    }
  }, [
    appliedInvoiceNo,
    appliedProductOrBarcode,
    appliedVendorName,
    notifyError,
    page,
    pageSize,
  ]);

  useEffect(() => {
    if (activeTab !== 'process') return;
    void loadInvoices();
  }, [activeTab, loadInvoices]);

  useEffect(() => {
    resetSelection();
  }, [page]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    resetSelection();
    setAppliedInvoiceNo(invoiceNo);
    setAppliedVendorName(vendorName);
    setAppliedProductOrBarcode(productOrBarcode);
    setPage(0);
  };

  const clearSearch = () => {
    setInvoiceNo('');
    setVendorName('');
    setProductOrBarcode('');
    setAppliedInvoiceNo('');
    setAppliedVendorName('');
    setAppliedProductOrBarcode('');
    resetSelection();
    setPage(0);
  };

  const hasActiveSearch = Boolean(
    appliedInvoiceNo.trim() ||
      appliedVendorName.trim() ||
      appliedProductOrBarcode.trim()
  );

  const selectInvoice = async (inv: VendorPurchaseInvoiceSummary) => {
    setSelected(inv);
    setQtyByInventoryId({});
    setReason('');
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
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

  const returnDebitNoteEstimate = useMemo(() => {
    let grand = 0;
    let linesWithQty = 0;
    for (const line of stockLines) {
      const id = line.inventoryId!;
      const raw = (qtyByInventoryId[id] ?? '').trim();
      if (raw === '') continue;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) continue;
      const invRow = inventoryById[id];
      const uc = Number(line.costPrice ?? invRow?.costPrice);
      const est = estimateDebitNoteLine(n, uc, invRow);
      if (est != null && est.total > 0) {
        grand += est.total;
        linesWithQty += 1;
      }
    }
    return {
      grandTotal: linesWithQty > 0 ? roundMoney2(grand) : 0,
      linesWithQty,
    };
  }, [stockLines, inventoryById, qtyByInventoryId]);

  const returnTotalNum = roundMoney(returnDebitNoteEstimate.grandTotal);
  const vendorRefundPaymentValidation = validatePaymentSplit(
    paymentMethod,
    paymentSplit,
    returnTotalNum
  );
  const canRecordReturn =
    returnTotalNum > 0 &&
    vendorRefundPaymentValidation.ok &&
    !returnRecording &&
    !detailBusy;

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
      const maxSell = maxReturnableSellUnits(invRow, line.count);
      const maxBase = maxReturnableBaseUnits(invRow, line.count);
      if (maxSell <= 0 || maxBase <= 0) {
        notifyError(`No stock on hand for “${line.name}”.`);
        return;
      }
      if (n > maxSell) {
        notifyError(
          `Return qty for “${line.name}” cannot exceed ${maxSell} selling units (on-hand cap).`
        );
        return;
      }
      const baseQty = sellUnitsToBaseQuantity(invRow, n);
      if (baseQty <= 0 || baseQty > maxBase) {
        notifyError(
          `Return qty for “${line.name}” is too large for current stock—try reducing the amount.`
        );
        return;
      }
      items.push({ inventoryId: id, baseQuantityReturned: baseQty });
    }

    if (items.length === 0) {
      notifyError(
        'Enter a return quantity for at least one line.'
      );
      return;
    }

    const returnTotal = returnDebitNoteEstimate.grandTotal;
    if (returnTotal <= 0) {
      notifyError('Enter return quantities to set a debit note total.');
      return;
    }
    if (!paymentMethod) {
      notifyError(
        'Choose how the supplier is refunding you (cash, online, credit, or mixed).'
      );
      return;
    }
    const payCheck = validatePaymentSplit(
      paymentMethod,
      paymentSplit,
      returnTotal
    );
    if (!payCheck.ok) {
      notifyError(payCheck.message ?? 'Invalid return payment split.');
      return;
    }

    setReturnRecording(true);
    try {
      const res = await inventoryApi.createVendorPurchaseReturn({
        vendorPurchaseInvoiceId: detail.id,
        items,
        reason: reason.trim() || undefined,
        paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
      });
      success(
        `Return recorded. Supplier credit note: ${res.supplierCreditNoteNo}. Amount: ${formatMoney(res.returnAmount)}`
      );
      setHistoryRefreshTrigger((t) => t + 1);
      resetSelection();
      void loadInvoices();
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
          Find a supplier purchase invoice, then enter how many selling units you are
          sending back—the same counting unit as stock on the shelf (like “Return to
          customer”). Credit notes appear in GSTR‑2 CDNR / CDNUR when applicable.
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
            Recent supplier purchase invoices load automatically. Narrow the list with
            search (same Java regex rules as History → Purchase history). When invoice
            number is set, product/barcode is omitted from the server search.
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
            {hasActiveSearch ? (
              <button
                type="button"
                className={refundStyles.searchBtn}
                disabled={searchLoading}
                onClick={clearSearch}
                style={{ marginLeft: '0.5rem' }}
              >
                Clear
              </button>
            ) : null}
          </form>
        </div>

        {vendorHint ? (
          <p className={styles.hint} role="status">
            {vendorHint}
          </p>
        ) : null}

        <div className={refundStyles.purchasesSection}>
          <h3 className={refundStyles.sectionTitle}>
            {hasActiveSearch ? 'Matching invoices' : 'Recent purchase invoices'}
          </h3>
          {searchLoading ? (
            <p className={refundStyles.loading}>Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <p className={refundStyles.emptyState}>
              {hasActiveSearch
                ? 'No purchase invoices matched. Try broader text or clear the search.'
                : 'No supplier purchase invoices yet.'}
            </p>
          ) : (
            <>
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
                        Select items to return
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
                              Loading shelf stock and pricing for this invoice…
                            </p>
                          ) : (
                            <p className={styles.hint}>
                              Quantities use the same <strong>selling unit</strong> as{' '}
                              <strong>Current qty</strong> (shelf / POS). Return qty cannot
                              exceed current qty when that figure is loaded; if base stock on
                              the lot is tighter, the allowed maximum is lower than current
                              qty. <strong>Est. debit note</strong> follows cost × return qty
                              (ex-GST), with CGST/SGST added on top — matching the supplier
                              credit note logic.
                            </p>
                          )}
                          <div className={refundStyles.itemsTable}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Item name</th>
                                  <th>MRP</th>
                                  <th>Cost</th>
                                  <th>Qty on bill</th>
                                  <th>Current qty</th>
                                  <th>GST rates</th>
                                  <th className={styles.numericCell}>Est. debit note</th>
                                  <th>Return qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockLines.map((line) => {
                                  const id = line.inventoryId!;
                                  const invRow = inventoryById[id];
                                  const maxSell = maxReturnableSellUnits(invRow, line.count);
                                  const rqRaw = (qtyByInventoryId[id] ?? '').trim();
                                  const rqParsed = Number.parseInt(rqRaw, 10);
                                  const rq =
                                    rqRaw !== '' &&
                                    Number.isFinite(rqParsed) &&
                                    rqParsed > 0
                                      ? rqParsed
                                      : 0;
                                  const unitCostRaw = Number(
                                    line.costPrice ?? invRow?.costPrice
                                  );
                                  const debitEst =
                                    rq > 0 &&
                                    Number.isFinite(unitCostRaw) &&
                                    unitCostRaw >= 0
                                      ? estimateDebitNoteLine(rq, unitCostRaw, invRow)
                                      : null;
                                  const debitTitle =
                                    debitEst != null
                                      ? [
                                          `Taxable ${formatMoney(debitEst.taxable)}`,
                                          debitEst.cgst > 0 ||
                                          debitEst.sgst > 0
                                            ? `CGST ${formatMoney(debitEst.cgst)}, SGST ${formatMoney(debitEst.sgst)}`
                                            : 'No GST on row',
                                          `Total ${formatMoney(debitEst.total)}`,
                                        ].join(' · ')
                                      : undefined;
                                  return (
                                    <tr key={`${line.lineIndex}-${id}`}>
                                      <td>{line.name}</td>
                                      <td>{formatMoney(invRow?.maximumRetailPrice)}</td>
                                      <td>
                                        {formatMoney(
                                          line.costPrice ?? invRow?.costPrice
                                        )}
                                      </td>
                                      <td>{line.count ?? '—'}</td>
                                      <td>{formatCurrentSellQtyDisplay(invRow)}</td>
                                      <td>{formatGstRatesLabel(invRow)}</td>
                                      <td
                                        className={styles.numericCell}
                                        title={debitTitle}
                                      >
                                        {debitEst != null
                                          ? formatMoney(debitEst.total)
                                          : '—'}
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          min={0}
                                          max={maxSell > 0 ? maxSell : undefined}
                                          className={refundStyles.quantityInput}
                                          inputMode="numeric"
                                          placeholder="0"
                                          title={
                                            maxSell > 0
                                              ? `Maximum return: ${maxSell} (≤ current qty / stock)`
                                              : undefined
                                          }
                                          disabled={
                                            returnRecording ||
                                            detailBusy ||
                                            maxSell <= 0
                                          }
                                          value={qtyByInventoryId[id] ?? ''}
                                          onChange={(ev) => {
                                            const raw = ev.target.value.trim();
                                            if (raw === '') {
                                              setQtyByInventoryId((prev) => ({
                                                ...prev,
                                                [id]: '',
                                              }));
                                              return;
                                            }
                                            const num = Number.parseInt(raw, 10);
                                            if (!Number.isFinite(num)) {
                                              return;
                                            }
                                            const clampedLow = Math.max(0, num);
                                            const capped =
                                              maxSell > 0
                                                ? Math.min(clampedLow, maxSell)
                                                : clampedLow;
                                            setQtyByInventoryId((prev) => ({
                                              ...prev,
                                              [id]: String(capped),
                                            }));
                                          }}
                                          aria-label={`Return quantity selling units for ${line.name}; maximum ${maxSell}`}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {returnDebitNoteEstimate.linesWithQty > 0 ? (
                            <p className={styles.returnEstimateBanner} role="status">
                              <strong>Estimated debit note total (incl. GST):</strong>{' '}
                              {formatMoney(returnDebitNoteEstimate.grandTotal)}
                              <span className={styles.returnEstimateMuted}>
                                {' '}
                                Per-line breakdown on hover · final amount set when you
                                record the return.
                              </span>
                            </p>
                          ) : null}
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

                      {returnDebitNoteEstimate.linesWithQty > 0 ? (
                        <div className={refundStyles.returnPaymentSection}>
                          <PaymentMethodSplit
                            context="purchase"
                            title="How are you receiving the refund?"
                            intro="Cash or online = money back now. Credit = reduces what you owe this vendor. Independent of how you paid the original invoice."
                            total={returnTotalNum}
                            value={{ method: paymentMethod, split: paymentSplit }}
                            onChange={(next) => {
                              setPaymentMethod(next.method);
                              setPaymentSplit(next.split);
                            }}
                            disabled={returnRecording || detailBusy}
                          />
                          {paymentMethod &&
                          isCreditMethod(paymentMethod) &&
                          paymentSplit.creditAmount > 0 ? (
                            <p className={refundStyles.returnPaymentHint}>
                              ₹{paymentSplit.creditAmount.toFixed(2)} reduces vendor
                              credit (you owe them less).
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className={refundStyles.processRefundBtn}
                        disabled={!canRecordReturn || stockLines.length === 0}
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
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage}
              disabled={searchLoading}
              aria-label="Purchase invoice pages"
            />
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
