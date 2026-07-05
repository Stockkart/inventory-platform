import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { inventoryApi } from '../api/inventory.api';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import type { InventoryCorrection, InventoryCorrectionLine, InventoryItem, VendorPurchaseInvoiceDetail, VendorPurchaseInvoiceSummary } from '@inventory-platform/product/types';
import styles from './stock-corrections.module.css';

export function meta() {
  return [
    { title: 'Stock corrections - StockKart' },
    {
      name: 'description',
      content: 'Correct inventory stock with pending approvals and history',
    },
  ];
}

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '-';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function dt(v: string | null | undefined): string {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function formatShortDate(iso: string): string {
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

/** Billing date when present; otherwise first stock-in timestamp so the line isn’t blank. */
function correctionInvoiceSubtitle(inv: VendorPurchaseInvoiceDetail): string {
  const invoiced = inv.invoiceDate?.trim();
  if (invoiced) return `Invoice ${formatShortDate(invoiced)}`;
  const recorded = inv.createdAt?.trim();
  if (recorded) return `Recorded ${formatShortDate(recorded)}`;
  return '—';
}

function vendorName(inv: { vendorName?: string | null }): string {
  const n = inv.vendorName?.trim();
  return n && n.length > 0 ? n : 'Unknown vendor';
}

function parseDisplayNumber(n: unknown): number | null {
  if (n == null || n === '') return null;
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x : null;
}

/** Signed qty delta: +n / −n vs current stock. */
function formatQtyDelta(corrected: number, current: number): string {
  const d = corrected - current;
  if (!Number.isFinite(d)) return '—';
  if (Object.is(d, -0) || d === 0) return '0';
  const abs = Math.abs(d);
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(4).replace(/\.?0+$/, '');
  return d > 0 ? `+${body}` : `-${body}`;
}

/** Loss (negative qty × cost); gain (positive qty × selling). */
function formatStockImpact(args: {
  corrected: number;
  current: number;
  costPrice: number | null;
  sellingPrice: number | null;
}): { text: string; kind: 'neutral' | 'loss' | 'gain' | 'na' } {
  const delta = args.corrected - args.current;
  if (!Number.isFinite(delta) || delta === 0) {
    return { text: '—', kind: 'neutral' };
  }
  if (delta < 0) {
    if (args.costPrice == null || !Number.isFinite(args.costPrice)) {
      return { text: '—', kind: 'na' };
    }
    const loss = delta * args.costPrice;
    return {
      text: money(loss),
      kind: 'loss',
    };
  }
  const sp =
    args.sellingPrice != null && Number.isFinite(args.sellingPrice)
      ? args.sellingPrice
      : null;
  if (sp == null) {
    return { text: '—', kind: 'na' };
  }
  const gain = delta * sp;
  return { text: `+${money(gain)}`, kind: 'gain' };
}

/**
 * Monetary impact for a line (cost × negative Δ, selling × positive Δ).
 * When {@code approvedOnly}, non-approved lines contribute null (excluded from net).
 */
function lineImpactRupees(
  line: InventoryCorrectionLine,
  inv: InventoryItem | undefined,
  approvedOnly: boolean
): number | null {
  if (approvedOnly && line.status !== 'APPROVED') return null;
  const prev = parseDisplayNumber(line.previousCurrentCount);
  const corr = Number(line.requestedCurrentCount);
  if (prev === null || !Number.isFinite(corr)) return null;
  const d = corr - prev;
  if (!Number.isFinite(d) || d === 0) return 0;
  if (d < 0) {
    const cp = inv?.costPrice != null ? Number(inv.costPrice) : null;
    if (cp == null || !Number.isFinite(cp)) return null;
    return d * cp;
  }
  const spRaw = inv?.sellingPrice ?? inv?.priceToRetail ?? null;
  const sp = spRaw != null ? Number(spRaw) : null;
  if (sp == null || !Number.isFinite(sp)) return null;
  return d * sp;
}

/** Net ₹ from approved-only lines for history summary. */
function summarizeApprovedNetImpact(
  c: InventoryCorrection,
  invMap: Record<string, InventoryItem>
): { total: number | null; partial: boolean } {
  const approvedLines = c.lines.filter((l) => l.status === 'APPROVED');
  if (approvedLines.length === 0)
    return { total: null, partial: false };
  let sum = 0;
  let partial = false;
  let counted = 0;
  for (const line of approvedLines) {
    const inv = invMap[line.inventoryId];
    const contrib = lineImpactRupees(line, inv, true);
    if (contrib === null) {
      partial = true;
      continue;
    }
    counted += 1;
    sum += contrib;
  }
  if (partial && counted === 0)
    return { total: null, partial: true };
  return { total: sum, partial };
}

export function StockCorrectionsPage() {
  const { user } = useAuthStore();
  const canApproveCorrections = useShopAccessStore((s) => {
    const access = user?.shopId ? s.byShopId[user.shopId] : undefined;
    return access?.stockCorrection?.canApprove ?? false;
  });

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoiceResults, setInvoiceResults] = useState<VendorPurchaseInvoiceSummary[]>(
    []
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<VendorPurchaseInvoiceDetail | null>(null);
  const [inventoryById, setInventoryById] = useState<Record<string, InventoryItem>>(
    {}
  );
  const [draftQtyByInventoryId, setDraftQtyByInventoryId] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'workbench' | 'history'>(
    'workbench'
  );
  const [pending, setPending] = useState<InventoryCorrection[]>([]);
  const [history, setHistory] = useState<InventoryCorrection[]>([]);
  const [historyInventoryById, setHistoryInventoryById] = useState<
    Record<string, InventoryItem>
  >({});
  const [pendingLoading, setPendingLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lineBusy, setLineBusy] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null
  );

  const searchInvoices = useCallback(async () => {
    setSearching(true);
    setError(null);
    try {
      const res = await inventoryApi.listVendorPurchaseInvoices(0, 20, query);
      setInvoiceResults(res.invoices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search invoices');
      setInvoiceResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await inventoryApi.listInventoryCorrections(0, 30, 'PENDING');
      setPending(res.corrections ?? []);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await inventoryApi.listInventoryCorrections(0, 80);
      setHistory((res.corrections ?? []).filter((c) => c.status !== 'PENDING'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
    void loadHistory();
  }, [loadHistory, loadPending]);

  const hydrateHistoryPricing = useCallback(async () => {
    const ids = new Set<string>();
    for (const c of history) {
      for (const line of c.lines ?? []) {
        if (line.inventoryId) ids.add(line.inventoryId);
      }
    }
    if (ids.size === 0) {
      setHistoryInventoryById({});
      return;
    }
    const idList = [...ids];
    try {
      const rows = await inventoryApi.getByIds(idList);
      const mapped: Record<string, InventoryItem> = {};
      for (let i = 0; i < idList.length; i += 1) {
        const item = rows[i];
        if (item) mapped[idList[i]] = item;
      }
      setHistoryInventoryById(mapped);
    } catch {
      setHistoryInventoryById({});
    }
  }, [history]);

  useEffect(() => {
    if (activeTab !== 'history' || history.length === 0) return;
    void hydrateHistoryPricing();
  }, [activeTab, history, hydrateHistoryPricing]);

  const pickInvoice = async (id: string) => {
    setError(null);
    setSuccess(null);
    setSelectedInvoice(null);
    setDraftQtyByInventoryId({});
    try {
      const detail = await inventoryApi.getVendorPurchaseInvoice(id);
      setSelectedInvoice(detail);
      const ids = Array.from(
        new Set(
          (detail.lines ?? [])
            .map((line) => line.inventoryId)
            .filter((v): v is string => Boolean(v))
        )
      );
      if (ids.length > 0) {
        const rows = await inventoryApi.getByIds(ids);
        const mapped: Record<string, InventoryItem> = {};
        for (let i = 0; i < ids.length; i += 1) {
          const inv = rows[i];
          if (inv) mapped[ids[i]] = inv;
        }
        setInventoryById(mapped);
      } else {
        setInventoryById({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice');
    }
  };

  const correctionRows = useMemo(() => {
    if (!selectedInvoice) return [];
    return (selectedInvoice.lines ?? [])
      .filter((line) => Boolean(line.inventoryId))
      .map((line) => {
        const inventoryId = line.inventoryId as string;
        const inv = inventoryById[inventoryId];
        const receivedQty =
          inv != null
            ? inv.receivedCount
            : line.count != null && Number.isFinite(Number(line.count))
              ? Number(line.count)
              : null;
        const currentRaw = inv?.currentCount ?? line.count ?? null;
        const draft = draftQtyByInventoryId[inventoryId] ?? '';
        const currentNum = parseDisplayNumber(currentRaw);
        const correctedNum =
          draft.trim() === '' ? null : Number(draft.trim());
        const correctedValid =
          correctedNum != null && Number.isFinite(correctedNum);
        const costPrice = line.costPrice ?? inv?.costPrice ?? null;
        const sellingPrice =
          inv?.sellingPrice ?? inv?.priceToRetail ?? null;
        let qtyDeltaDisplay = '—';
        let impact: { text: string; kind: 'neutral' | 'loss' | 'gain' | 'na' } = {
          text: '—',
          kind: 'neutral',
        };
        if (correctedValid && currentNum !== null) {
          qtyDeltaDisplay = formatQtyDelta(correctedNum, currentNum);
          impact = formatStockImpact({
            corrected: correctedNum,
            current: currentNum,
            costPrice: costPrice != null ? Number(costPrice) : null,
            sellingPrice:
              sellingPrice != null ? Number(sellingPrice) : null,
          });
        }

        return {
          inventoryId,
          name: line.name,
          batchNo: inv?.batchNo ?? null,
          receivedQty,
          currentCount: currentRaw,
          requestedCount: draft,
          costPrice,
          sellingPrice,
          qtyDeltaDisplay,
          impact,
        };
      });
  }, [draftQtyByInventoryId, inventoryById, selectedInvoice]);

  const submitCorrection = async () => {
    if (!selectedInvoice) return;
    const lines = correctionRows
      .map((row) => {
        const requested = Number(row.requestedCount);
        const current =
          row.currentCount != null && Number.isFinite(Number(row.currentCount))
            ? Number(row.currentCount)
            : null;
        if (!row.requestedCount.trim() || !Number.isFinite(requested)) return null;
        if (requested < 0) return null;
        if (current != null && requested === current) return null;
        return { inventoryId: row.inventoryId, requestedCurrentCount: requested };
      })
      .filter((x): x is { inventoryId: string; requestedCurrentCount: number } => x != null);

    if (lines.length === 0) {
      setError('Enter at least one changed quantity before sending to pending.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await inventoryApi.createInventoryCorrection({
        vendorPurchaseInvoiceId: selectedInvoice.id,
        invoiceNo: selectedInvoice.invoiceNo,
        vendorId: selectedInvoice.vendorId,
        vendorName: selectedInvoice.vendorName ?? null,
        lines,
      });
      setSuccess('Correction submitted to pending for approval.');
      setDraftQtyByInventoryId({});
      await Promise.all([loadPending(), loadHistory()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create correction');
    } finally {
      setSubmitting(false);
    }
  };

  const processLine = async (
    correctionId: string,
    lineId: string,
    action: 'approve' | 'reject'
  ) => {
    const key = `${correctionId}:${lineId}:${action}`;
    setLineBusy(key);
    setError(null);
    try {
      if (action === 'approve') {
        await inventoryApi.approveInventoryCorrectionLine(correctionId, lineId);
      } else {
        await inventoryApi.rejectInventoryCorrectionLine(correctionId, lineId);
      }
      await Promise.all([loadPending(), loadHistory()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process correction line');
    } finally {
      setLineBusy(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Correct stock / price</h1>
        <p className={styles.subtitle}>
          Search invoices by product, barcode, invoice no, or vendor name;
          propose quantity corrections and approve lines;
          and review correction history.
        </p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Stock corrections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'workbench'}
          className={`${styles.tabBtn} ${activeTab === 'workbench' ? styles.tabActive : ''}`}
          onClick={() => {
            if (activeTab !== 'workbench')
              setExpandedHistoryId(null);
            setActiveTab('workbench');
          }}
        >
          Workbench
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => {
            if (activeTab !== 'history')
              setExpandedHistoryId(null);
            setActiveTab('history');
          }}
        >
          History
        </button>
      </div>

      {activeTab === 'workbench' ? (
      <>
      <section className={styles.card}>
        <div className={styles.row}>
          <input
            className={styles.input}
            placeholder="Product, barcode, invoice no, or vendor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={styles.btn}
            disabled={searching}
            onClick={searchInvoices}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Lines</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoiceResults.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNo}</td>
                  <td>{vendorName(inv)}</td>
                  <td>{dt(inv.invoiceDate)}</td>
                  <td>{inv.lineCount}</td>
                  <td>{money(inv.invoiceTotal)}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.btnLink}
                      onClick={() => pickInvoice(inv.id)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
              {invoiceResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.muted}>
                    No results yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionTitle}>Create pending correction</div>
        {!selectedInvoice ? (
          <div className={styles.muted}>Select an invoice above first.</div>
        ) : (
          <>
            <div className={styles.meta}>
              <strong>{selectedInvoice.invoiceNo}</strong> ·{' '}
              {vendorName(selectedInvoice)} ·{' '}
              {correctionInvoiceSubtitle(selectedInvoice)}
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th title="Quantity received on this stock-in">
                      Received qty
                    </th>
                    <th>Current qty</th>
                    <th>Corrected qty</th>
                    <th>Change</th>
                    <th title="Loss at cost when qty drops; gain at selling price when qty rises">
                      Impact
                    </th>
                    <th>Cost price</th>
                    <th>Selling price</th>
                  </tr>
                </thead>
                <tbody>
                  {correctionRows.map((row) => (
                    <tr key={row.inventoryId}>
                      <td>{row.name}</td>
                      <td>{row.batchNo ?? '-'}</td>
                      <td>
                        {row.receivedQty != null &&
                        Number.isFinite(Number(row.receivedQty))
                          ? row.receivedQty
                          : '—'}
                      </td>
                      <td>{row.currentCount ?? '-'}</td>
                      <td>
                        <input
                          className={styles.inputSmall}
                          value={row.requestedCount}
                          onChange={(e) =>
                            setDraftQtyByInventoryId((prev) => ({
                              ...prev,
                              [row.inventoryId]: e.target.value,
                            }))
                          }
                          placeholder="new qty"
                        />
                      </td>
                      <td>
                        <span
                          className={
                            row.qtyDeltaDisplay.startsWith('+')
                              ? styles.deltaPositive
                              : row.qtyDeltaDisplay.startsWith('-')
                                ? styles.deltaNegative
                                : undefined
                          }
                        >
                          {row.qtyDeltaDisplay}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            row.impact.kind === 'loss'
                              ? styles.impactLoss
                              : row.impact.kind === 'gain'
                                ? styles.impactGain
                                : undefined
                          }
                        >
                          {row.impact.text}
                        </span>
                      </td>
                      <td>{money(row.costPrice)}</td>
                      <td>{money(row.sellingPrice)}</td>
                    </tr>
                  ))}
                  {correctionRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={styles.muted}>
                        No inventory lines found for correction.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                disabled={submitting}
                onClick={submitCorrection}
              >
                {submitting ? 'Submitting...' : 'Send to pending'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionTitle}>Pending approvals</div>
        {!canApproveCorrections ? (
          <p className={styles.muted}>
            Pending corrections are listed below. Only the shop owner or a manager
            can approve or reject them.
          </p>
        ) : null}
        {pendingLoading ? (
          <div className={styles.muted}>Loading pending...</div>
        ) : pending.length === 0 ? (
          <div className={styles.muted}>No pending corrections.</div>
        ) : (
          pending.map((c) => (
            <div key={c.id} className={styles.block}>
              <div className={styles.meta}>
                <strong>{c.invoiceNo ?? 'No invoice'}</strong> ·{' '}
                {c.vendorName ?? 'Unknown vendor'} · {dt(c.createdAt)}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Prev qty</th>
                      <th>Requested qty</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.lines.map((line) => (
                      <tr key={line.lineId}>
                        <td>{line.productName ?? line.inventoryId}</td>
                        <td>{line.previousCurrentCount ?? '-'}</td>
                        <td>{line.requestedCurrentCount}</td>
                        <td>{line.status}</td>
                        <td>
                          {line.status === 'PENDING' && canApproveCorrections ? (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.btnLink}
                                disabled={lineBusy != null}
                                onClick={() =>
                                  processLine(c.id, line.lineId, 'approve')
                                }
                              >
                                {lineBusy === `${c.id}:${line.lineId}:approve`
                                  ? 'Approving...'
                                  : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className={styles.btnLinkDanger}
                                disabled={lineBusy != null}
                                onClick={() =>
                                  processLine(c.id, line.lineId, 'reject')
                                }
                              >
                                {lineBusy === `${c.id}:${line.lineId}:reject`
                                  ? 'Rejecting...'
                                  : 'Reject'}
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
      </>
      ) : null}

      {activeTab === 'history' ? (
      <section className={styles.card}>
        <div className={styles.sectionTitle}>Correction history</div>
        <p className={styles.historyDetailCaption}>
          Net impact sums <strong>approved</strong> lines only — shrinkage valued at{' '}
          <strong>cost</strong>, extras at <strong>selling price</strong> (from current
          inventory pricing when you open this tab).
        </p>
        {historyLoading ? (
          <div className={styles.muted}>Loading history…</div>
        ) : history.length === 0 ? (
          <div className={styles.muted}>No correction history yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Invoice</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Lines</th>
                  <th>Approved</th>
                  <th>Net impact</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const approvedCount = c.lines.filter(
                    (l) => l.status === 'APPROVED'
                  ).length;
                  const { total: netTotal, partial: netPartial } =
                    summarizeApprovedNetImpact(c, historyInventoryById);
                  const open = expandedHistoryId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            className={`${styles.btnLink} ${styles.detailToggle}`}
                            onClick={() =>
                              setExpandedHistoryId(open ? null : c.id)
                            }
                            aria-expanded={open}
                          >
                            {open ? 'Hide' : 'Details'}
                          </button>
                        </td>
                        <td>{c.invoiceNo ?? '-'}</td>
                        <td>{c.vendorName ?? '-'}</td>
                        <td>{c.status}</td>
                        <td>{c.lines.length}</td>
                        <td>{approvedCount}</td>
                        <td className={styles.netCell}>
                          {approvedCount === 0 ? (
                            '—'
                          ) : netTotal == null ? (
                            <>
                              <span>—</span>
                              {netPartial ? (
                                <span
                                  className={styles.estPartial}
                                  title="Approved lines missing cost or selling price on file"
                                >
                                  {' '}
                                  *
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <span
                                className={
                                  netTotal > 0
                                    ? styles.impactGain
                                    : netTotal < 0
                                      ? styles.impactLoss
                                      : undefined
                                }
                              >
                                {money(netTotal)}
                              </span>
                              {netPartial ? (
                                <span
                                  className={styles.estPartial}
                                  title="Some approved lines had no cost or selling price — total excludes those lines"
                                >
                                  {' '}
                                  *
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td>{dt(c.createdAt)}</td>
                      </tr>
                      {open ? (
                        <tr>
                          <td colSpan={8} className={styles.historyDetail}>
                            <div className={styles.historyDetailCaption}>
                              Line breakdown: change vs quantity before correction. Impact
                              uses the same rules as Workbench (loss at cost, gain at
                              selling price). Rejected lines were not applied. An
                              asterisk on net impact means some approved lines lack
                              pricing on file or were excluded from the total.
                              {netPartial && approvedCount > 0 ? (
                                <> Some rows above may show “—” for impact until pricing loads or is filled in.</>
                              ) : null}
                            </div>
                            <div className={styles.tableWrap}>
                              <table className={styles.table}>
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>Prev qty</th>
                                    <th>Requested</th>
                                    <th>Change</th>
                                    <th>Impact</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.lines.map((line) => {
                                    const inv =
                                      historyInventoryById[line.inventoryId];
                                    const prev = parseDisplayNumber(
                                      line.previousCurrentCount
                                    );
                                    const req = Number(line.requestedCurrentCount);
                                    const qtyOk =
                                      prev != null && Number.isFinite(req);
                                    const qtyDisplay = qtyOk
                                      ? formatQtyDelta(req, prev)
                                      : '—';
                                    const impactUi =
                                      qtyOk
                                        ? formatStockImpact({
                                            corrected: req,
                                            current: prev,
                                            costPrice:
                                              inv?.costPrice != null
                                                ? Number(inv.costPrice)
                                                : null,
                                            sellingPrice:
                                              inv?.sellingPrice != null
                                                ? Number(inv.sellingPrice)
                                                : inv?.priceToRetail != null
                                                  ? Number(inv.priceToRetail)
                                                  : null,
                                          })
                                        : {
                                            text: '—',
                                            kind: 'neutral' as const,
                                          };

                                    const statusHint =
                                      line.status === 'REJECTED'
                                        ? ' (not applied)'
                                        : line.status !== 'APPROVED'
                                          ? ''
                                          : '';
                                    return (
                                      <tr key={line.lineId}>
                                        <td>
                                          {line.productName ?? '—'}{' '}
                                          {inv?.batchNo ? (
                                            <span className={styles.estPartial}>
                                              · batch {inv.batchNo}
                                            </span>
                                          ) : null}
                                        </td>
                                        <td>
                                          {line.previousCurrentCount ?? '—'}
                                        </td>
                                        <td>{line.requestedCurrentCount}</td>
                                        <td>
                                          <span
                                            className={
                                              qtyDisplay.startsWith('+')
                                                ? styles.deltaPositive
                                                : qtyDisplay.startsWith('-')
                                                  ? styles.deltaNegative
                                                  : undefined
                                            }
                                          >
                                            {qtyDisplay}
                                          </span>
                                        </td>
                                        <td>
                                          <span
                                            className={
                                              impactUi.kind === 'loss'
                                                ? styles.impactLoss
                                                : impactUi.kind === 'gain'
                                                  ? styles.impactGain
                                                  : undefined
                                            }
                                          >
                                            {impactUi.text}
                                          </span>
                                        </td>
                                        <td className={styles.lineStatusMuted}>
                                          {line.status}
                                          {statusHint}
                                          {line.rejectionReason &&
                                          line.status === 'REJECTED' ? (
                                            <> — {line.rejectionReason}</>
                                          ) : null}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
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
        )}
      </section>
      ) : null}
    </div>
  );
}

