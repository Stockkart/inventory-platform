import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import type {
  InventoryCorrection,
  InventoryCorrectionLine,
  InventoryItem,
  VendorPurchaseInvoiceSummary,
} from '@inventory-platform/product/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Icon,
  IconButton,
  Inline,
  Input,
  PageHeader,
  SearchInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  productChrome,
  cn,
  surfaceChrome,
  type BadgeVariant,
} from '@inventory-platform/ui-kit';
import { ChevronDown, ChevronUp, Plus, Printer, Trash2 } from 'lucide-react';
import { openStockCountSheetPrintWindow } from '../lib/printStockCountSheet';

export function meta() {
  return [
    { title: 'Stock corrections - StockKart' },
    {
      name: 'description',
      content:
        'Build a count list, print it for a physical count, enter counted qty, and send to pending',
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
    return new Date(v).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return v;
  }
}

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function correctionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'APPLIED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'PARTIALLY_APPROVED':
      return 'info';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function lineStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
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

function vendorName(inv: { vendorName?: string | null }): string {
  const n = inv.vendorName?.trim();
  return n && n.length > 0 ? n : 'Unknown vendor';
}

type WorkbenchSource = 'product' | 'invoice';

type StockImpactKind = 'neutral' | 'loss' | 'gain' | 'na';

type InvoiceMeta = {
  invoiceNo: string;
};

type CorrectionDraftRow = {
  inventoryId: string;
  name: string | null;
  batchNo: string | null;
  invoiceNo: string | null;
  createdAt: string | null;
  receivedQty: number | null;
  currentCount: number | string | null;
  requestedCount: string;
  costPrice: number | null;
  sellingPrice: number | null;
  qtyDeltaDisplay: string;
  impact: { text: string; kind: StockImpactKind };
};

function toCorrectionDraftRow(args: {
  inventoryId: string;
  name: string | null;
  batchNo: string | null;
  invoiceNo: string | null;
  createdAt: string | null;
  receivedQty: number | null;
  currentRaw: number | string | null;
  requestedCount: string;
  costPrice: number | null;
  sellingPrice: number | null;
}): CorrectionDraftRow {
  const currentNum = parseDisplayNumber(args.currentRaw);
  const draft = args.requestedCount;
  const correctedNum = draft.trim() === '' ? null : Number(draft.trim());
  const correctedValid = correctedNum != null && Number.isFinite(correctedNum);
  let qtyDeltaDisplay = '—';
  let impact: { text: string; kind: StockImpactKind } = {
    text: '—',
    kind: 'neutral',
  };
  if (correctedValid && currentNum !== null) {
    qtyDeltaDisplay = formatQtyDelta(correctedNum, currentNum);
    impact = formatStockImpact({
      corrected: correctedNum,
      current: currentNum,
      costPrice: args.costPrice != null ? Number(args.costPrice) : null,
      sellingPrice: args.sellingPrice != null ? Number(args.sellingPrice) : null,
    });
  }
  return {
    inventoryId: args.inventoryId,
    name: args.name,
    batchNo: args.batchNo,
    invoiceNo: args.invoiceNo,
    createdAt: args.createdAt,
    receivedQty: args.receivedQty,
    currentCount: args.currentRaw,
    requestedCount: draft,
    costPrice: args.costPrice,
    sellingPrice: args.sellingPrice,
    qtyDeltaDisplay,
    impact,
  };
}

function correctionSourceTitle(c: InventoryCorrection): string {
  const invoice = c.invoiceNo?.trim();
  if (invoice) return invoice;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of c.lines ?? []) {
    const name = line.productName?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  if (names.length === 0) return 'Product lots';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

function correctionVendorLabel(c: InventoryCorrection): string {
  const vendor = c.vendorName?.trim();
  if (vendor) return vendor;
  if (c.invoiceNo?.trim()) return 'Unknown vendor';
  return '—';
}

function groupCorrectionRows(
  rows: CorrectionDraftRow[],
): { name: string; rows: CorrectionDraftRow[] }[] {
  const byName = new Map<string, CorrectionDraftRow[]>();
  for (const row of rows) {
    const name = row.name?.trim() || 'Product';
    const list = byName.get(name);
    if (list) {
      list.push(row);
    } else {
      byName.set(name, [row]);
    }
  }
  return [...byName.entries()].map(([name, groupRows]) => ({ name, rows: groupRows }));
}

function lotTimestamp(item: Pick<InventoryItem, 'createdAt' | 'purchaseDate'>): number {
  const raw = item.createdAt?.trim() || item.purchaseDate?.trim();
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function sortLotsLatestFirst(lots: InventoryItem[]): InventoryItem[] {
  return [...lots].sort((a, b) => lotTimestamp(b) - lotTimestamp(a));
}

function lotCreatedLabel(item: Pick<InventoryItem, 'createdAt' | 'purchaseDate'>): string | null {
  const raw = item.createdAt?.trim() || item.purchaseDate?.trim();
  return raw ? formatShortDate(raw) : null;
}

function lotBatchNo(
  item: Pick<InventoryItem, 'batchNo' | 'verticalFields'> | null | undefined,
): string | null {
  if (!item) return null;
  const core = item.batchNo?.trim();
  if (core) return core;
  const ext = item.verticalFields?.batchNo;
  if (typeof ext === 'string' && ext.trim()) return ext.trim();
  return null;
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
    args.sellingPrice != null && Number.isFinite(args.sellingPrice) ? args.sellingPrice : null;
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
  approvedOnly: boolean,
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
  invMap: Record<string, InventoryItem>,
): { total: number | null; partial: boolean } {
  const approvedLines = c.lines.filter((l) => l.status === 'APPROVED');
  if (approvedLines.length === 0) return { total: null, partial: false };
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
  if (partial && counted === 0) return { total: null, partial: true };
  return { total: sum, partial };
}

function qtyDeltaClass(display: string): string | undefined {
  if (display.startsWith('+')) return surfaceChrome.qtyDeltaPos;
  if (display.startsWith('-')) return surfaceChrome.qtyDeltaNeg;
  return undefined;
}

function impactClass(kind: string): string {
  if (kind === 'increase' || kind === 'gain') return surfaceChrome.impactIncrease;
  if (kind === 'decrease' || kind === 'loss') return surfaceChrome.impactDecrease;
  return surfaceChrome.impactNeutral;
}

export function StockCorrectionsPage() {
  const { user, shop } = useAuthStore();
  const canApproveCorrections = useShopAccessStore((s) => {
    const access = user?.shopId ? s.byShopId[user.shopId] : undefined;
    return access?.stockCorrection?.canApprove ?? false;
  });

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [workbenchSource, setWorkbenchSource] = useState<WorkbenchSource>('product');
  const [lotResults, setLotResults] = useState<InventoryItem[]>([]);
  const [productSearchAttempted, setProductSearchAttempted] = useState(false);
  const [countList, setCountList] = useState<InventoryItem[]>([]);
  const [invoiceResults, setInvoiceResults] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [addingInvoiceId, setAddingInvoiceId] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [invoiceLotsById, setInvoiceLotsById] = useState<Record<string, InventoryItem[]>>({});
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [invoiceMetaById, setInvoiceMetaById] = useState<Record<string, InvoiceMeta>>({});
  const [draftQtyByInventoryId, setDraftQtyByInventoryId] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'workbench' | 'history'>('workbench');
  const [pending, setPending] = useState<InventoryCorrection[]>([]);
  const [history, setHistory] = useState<InventoryCorrection[]>([]);
  const [historyInventoryById, setHistoryInventoryById] = useState<Record<string, InventoryItem>>(
    {},
  );
  const [pendingLoading, setPendingLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lineBusy, setLineBusy] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const countListIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of countList) {
      const id = resolveInventoryDocumentId(item);
      if (id) ids.add(id);
    }
    return ids;
  }, [countList]);

  const clearSearchResults = useCallback(() => {
    setInvoiceResults([]);
    setLotResults([]);
    setProductSearchAttempted(false);
    setExpandedInvoiceId(null);
    setInvoiceLotsById({});
    setLoadingInvoiceId(null);
  }, []);

  const clearCountList = useCallback(() => {
    setCountList([]);
    setInvoiceMetaById({});
    setDraftQtyByInventoryId({});
  }, []);

  const switchWorkbenchSource = (next: WorkbenchSource) => {
    if (next === workbenchSource) return;
    setWorkbenchSource(next);
    clearSearchResults();
    setError(null);
    setSuccess(null);
  };

  const mergeInvoiceMeta = useCallback(async (items: InventoryItem[]) => {
    const invoiceIds = [
      ...new Set(
        items
          .map((item) => item.vendorPurchaseInvoiceId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (invoiceIds.length === 0) return;
    const entries = await Promise.all(
      invoiceIds.map(async (id) => {
        try {
          const invoice = await inventoryApi.getVendorPurchaseInvoice(id);
          const invoiceNo = invoice.invoiceNo?.trim();
          return invoiceNo ? ([id, { invoiceNo }] as const) : null;
        } catch {
          return null;
        }
      }),
    );
    setInvoiceMetaById((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      return next;
    });
  }, []);

  const addInventoryItems = useCallback(
    (items: InventoryItem[]): { added: number; skipped: number } => {
      const fresh: InventoryItem[] = [];
      const seen = new Set<string>();
      let skipped = 0;
      for (const item of items) {
        const id = resolveInventoryDocumentId(item);
        if (!id) continue;
        if (countListIds.has(id) || seen.has(id)) {
          skipped += 1;
          continue;
        }
        seen.add(id);
        fresh.push(item);
      }
      if (fresh.length === 0) {
        return { added: 0, skipped };
      }
      setCountList((prev) => [...prev, ...fresh]);
      void mergeInvoiceMeta(fresh);
      return { added: fresh.length, skipped };
    },
    [countListIds, mergeInvoiceMeta],
  );

  const searchWorkbench = useCallback(async () => {
    setSearching(true);
    setError(null);
    setSuccess(null);
    if (workbenchSource === 'product') {
      setProductSearchAttempted(true);
      try {
        const res = await inventoryApi.search({
          q: query.trim() || undefined,
          limit: 50,
        });
        const lots = sortLotsLatestFirst(
          (res.data ?? []).filter((item) => Boolean(resolveInventoryDocumentId(item))),
        );
        setLotResults(lots);
        void mergeInvoiceMeta(lots);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to search products');
        setLotResults([]);
      } finally {
        setSearching(false);
      }
      return;
    }
    try {
      const res = await inventoryApi.listVendorPurchaseInvoices(0, 20, query);
      setInvoiceResults(res.invoices ?? []);
      setExpandedInvoiceId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search invoices');
      setInvoiceResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, workbenchSource, mergeInvoiceMeta]);

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

  const ensureInvoiceLots = useCallback(
    async (id: string): Promise<InventoryItem[]> => {
      const cached = invoiceLotsById[id];
      if (cached) return cached;
      const detail = await inventoryApi.getVendorPurchaseInvoice(id);
      const ids = Array.from(
        new Set(
          (detail.lines ?? [])
            .map((line) => line.inventoryId)
            .filter((v): v is string => Boolean(v)),
        ),
      );
      if (ids.length === 0) {
        setInvoiceLotsById((prev) => ({ ...prev, [id]: [] }));
        return [];
      }
      const rows = await inventoryApi.getByIds(ids);
      const lots = sortLotsLatestFirst(
        ids.map((_, i) => rows[i]).filter((item): item is InventoryItem => Boolean(item)),
      );
      if (detail.invoiceNo?.trim()) {
        setInvoiceMetaById((prev) => ({
          ...prev,
          [detail.id]: { invoiceNo: detail.invoiceNo.trim() },
        }));
      }
      setInvoiceLotsById((prev) => ({ ...prev, [id]: lots }));
      return lots;
    },
    [invoiceLotsById],
  );

  const toggleInvoiceExpand = async (id: string) => {
    if (expandedInvoiceId === id) {
      setExpandedInvoiceId(null);
      return;
    }
    setExpandedInvoiceId(id);
    setError(null);
    if (invoiceLotsById[id]) return;
    setLoadingInvoiceId(id);
    try {
      await ensureInvoiceLots(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice lines');
      setExpandedInvoiceId(null);
    } finally {
      setLoadingInvoiceId(null);
    }
  };
  const addInvoiceToList = async (id: string) => {
    setError(null);
    setSuccess(null);
    setAddingInvoiceId(id);
    try {
      const lots = await ensureInvoiceLots(id);
      if (lots.length === 0) {
        setError('No inventory lines found on that invoice.');
        return;
      }
      const { added, skipped } = addInventoryItems(lots);
      if (added === 0) {
        setSuccess(
          skipped > 0 ? 'Those lots are already on the count list.' : 'No lots were added.',
        );
      } else {
        setSuccess(
          skipped > 0
            ? `Added ${added} lots (${skipped} already on the list).`
            : `Added ${added} lots to the count list.`,
        );
        window.setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice');
    } finally {
      setAddingInvoiceId(null);
    }
  };

  const addSearchLots = (items: InventoryItem[]) => {
    setError(null);
    const { added, skipped } = addInventoryItems(items);
    if (added === 0) {
      setSuccess(skipped > 0 ? 'Those lots are already on the count list.' : 'No lots were added.');
    } else {
      setSuccess(
        skipped > 0
          ? `Added ${added} lots (${skipped} already on the list).`
          : `Added ${added} lots to the count list.`,
      );
      window.setTimeout(() => setSuccess(null), 3000);
    }
  };

  const removeFromCountList = (inventoryId: string) => {
    setCountList((prev) => prev.filter((item) => resolveInventoryDocumentId(item) !== inventoryId));
    setDraftQtyByInventoryId((prev) => {
      const next = { ...prev };
      delete next[inventoryId];
      return next;
    });
  };

  const correctionRows = useMemo((): CorrectionDraftRow[] => {
    return countList.flatMap((item) => {
      const inventoryId = resolveInventoryDocumentId(item);
      if (!inventoryId) return [];
      const received = parseDisplayNumber(item.receivedCount);
      return [
        toCorrectionDraftRow({
          inventoryId,
          name: item.name ?? null,
          batchNo: lotBatchNo(item),
          invoiceNo: invoiceMetaById[item.vendorPurchaseInvoiceId?.trim() ?? '']?.invoiceNo ?? null,
          createdAt: item.createdAt?.trim() || item.purchaseDate?.trim() || null,
          receivedQty: received,
          currentRaw: item.currentCount ?? null,
          requestedCount: draftQtyByInventoryId[inventoryId] ?? '',
          costPrice: item.costPrice ?? null,
          sellingPrice: item.sellingPrice ?? item.priceToRetail ?? null,
        }),
      ];
    });
  }, [countList, draftQtyByInventoryId, invoiceMetaById]);

  const correctionGroups = useMemo(() => groupCorrectionRows(correctionRows), [correctionRows]);
  const showBatchColumn = correctionRows.some((row) => Boolean(row.batchNo));
  const searchLotsToAdd = lotResults.filter((item) => {
    const id = resolveInventoryDocumentId(item);
    return id != null && !countListIds.has(id);
  });

  const printCountSheet = () => {
    if (correctionRows.length === 0) return;
    try {
      openStockCountSheetPrintWindow({
        shopName: shop?.name,
        printedAt: new Date().toLocaleString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        lines: correctionRows.map((row) => ({
          name: row.name?.trim() || 'Product',
          batchNo: row.batchNo,
          invoiceNo: row.invoiceNo,
          createdLabel: row.createdAt ? formatShortDate(row.createdAt) : null,
          currentQty:
            row.currentCount != null && Number.isFinite(Number(row.currentCount))
              ? String(row.currentCount)
              : '—',
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to print count sheet');
    }
  };

  const submitCorrection = async () => {
    if (correctionRows.length === 0) return;
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
      setError('Enter at least one counted quantity that differs from system qty.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await inventoryApi.createInventoryCorrection({
        note: 'Product stock correction',
        lines,
      });
      clearCountList();
      setSuccess('Correction submitted to pending for approval.');
      window.setTimeout(() => setSuccess(null), 3000);
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
    action: 'approve' | 'reject',
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

  const pendingLineRows = useMemo(() => {
    const rows: Array<{
      correctionId: string;
      line: InventoryCorrectionLine;
      invoiceNo: string | null;
      vendor: string | null;
      submittedAt: string;
    }> = [];
    for (const c of pending) {
      for (const line of c.lines ?? []) {
        if (line.status !== 'PENDING') continue;
        rows.push({
          correctionId: c.id,
          line,
          invoiceNo: c.invoiceNo?.trim() || null,
          vendor: c.vendorName?.trim() || null,
          submittedAt: c.createdAt,
        });
      }
    }
    return rows;
  }, [pending]);

  const processAllPending = async (action: 'approve' | 'reject') => {
    if (pendingLineRows.length === 0) return;
    setLineBusy(`bulk:${action}`);
    setError(null);
    setSuccess(null);
    let done = 0;
    try {
      for (const row of pendingLineRows) {
        if (action === 'approve') {
          await inventoryApi.approveInventoryCorrectionLine(row.correctionId, row.line.lineId);
        } else {
          await inventoryApi.rejectInventoryCorrectionLine(row.correctionId, row.line.lineId);
        }
        done += 1;
      }
      setSuccess(action === 'approve' ? `Approved ${done} lines.` : `Rejected ${done} lines.`);
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      const prefix = e instanceof Error ? e.message : 'Failed to process correction lines';
      setError(done > 0 ? `${prefix} ${done} line(s) already processed.` : prefix);
    } finally {
      setLineBusy(null);
      await Promise.all([loadPending(), loadHistory()]);
    }
  };

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader description="Add lots to a count list, print it for a physical count, enter counted qty from the paper, then send to pending for approval." />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Inline gap="none" className={productChrome.processTabBar}>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'workbench'}
          className={cn(
            productChrome.processTab,
            activeTab === 'workbench' && productChrome.processTabActive,
          )}
          onClick={() => {
            if (activeTab !== 'workbench') setExpandedHistoryId(null);
            setActiveTab('workbench');
          }}
        >
          Workbench
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={cn(
            productChrome.processTab,
            activeTab === 'history' && productChrome.processTabActive,
          )}
          onClick={() => {
            if (activeTab !== 'history') setExpandedHistoryId(null);
            setActiveTab('history');
          }}
        >
          History
        </Button>
      </Inline>

      {activeTab === 'workbench' ? (
        <>
          <Card>
            <CardBody>
              <Stack gap="md">
                <Inline gap="none" className={productChrome.processTabBar}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    role="tab"
                    aria-selected={workbenchSource === 'product'}
                    className={cn(
                      productChrome.processTab,
                      workbenchSource === 'product' && productChrome.processTabActive,
                    )}
                    onClick={() => switchWorkbenchSource('product')}
                  >
                    By product
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    role="tab"
                    aria-selected={workbenchSource === 'invoice'}
                    className={cn(
                      productChrome.processTab,
                      workbenchSource === 'invoice' && productChrome.processTabActive,
                    )}
                    onClick={() => switchWorkbenchSource('invoice')}
                  >
                    By invoice
                  </Button>
                </Inline>
                <Box width="full" className={productChrome.searchGrow}>
                  <SearchInput
                    value={query}
                    onChange={setQuery}
                    onSearch={searchWorkbench}
                    showSearchButton
                    buttonVariant="solid"
                    placeholder={
                      workbenchSource === 'product'
                        ? 'Product name, barcode, or batch'
                        : 'Product, barcode, invoice no, or vendor'
                    }
                  />
                </Box>
                {workbenchSource === 'product' && productSearchAttempted ? (
                  searching ? (
                    <CenteredLoader label="Searching lots…" />
                  ) : lotResults.length === 0 ? (
                    <EmptyState title="No matching lots." />
                  ) : (
                    <Stack gap="sm">
                      <Inline align="center" justify="between">
                        <Text color="secondary" variant="caption">
                          {lotResults.length} lots matching
                          {query.trim() ? ` “${query.trim()}”` : ''}
                          {searchLotsToAdd.length < lotResults.length
                            ? ` · ${lotResults.length - searchLotsToAdd.length} already on the list`
                            : ''}
                        </Text>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={searchLotsToAdd.length === 0}
                          leftIcon={<Icon icon={Plus} size="sm" />}
                          onClick={() => addSearchLots(searchLotsToAdd)}
                        >
                          Add all ({searchLotsToAdd.length})
                        </Button>
                      </Inline>
                      <Box overflow="auto">
                        <Table className={productChrome.correctionDraftTable}>
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell>Product</TableHeaderCell>
                              <TableHeaderCell>Batch</TableHeaderCell>
                              <TableHeaderCell>Invoice</TableHeaderCell>
                              <TableHeaderCell>Created</TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                Received
                              </TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                Current
                              </TableHeaderCell>
                              <TableHeaderCell></TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {lotResults.map((item) => {
                              const inventoryId = resolveInventoryDocumentId(item);
                              const alreadyAdded =
                                inventoryId != null && countListIds.has(inventoryId);
                              const invoiceId = item.vendorPurchaseInvoiceId?.trim() ?? '';
                              return (
                                <TableRow key={inventoryId ?? item.lotId}>
                                  <TableCell>
                                    <Text weight="semibold">{item.name ?? 'Product'}</Text>
                                  </TableCell>
                                  <TableCell className={productChrome.correctionMetaCell}>
                                    {lotBatchNo(item) ?? '—'}
                                  </TableCell>
                                  <TableCell className={productChrome.correctionMetaCell}>
                                    {invoiceMetaById[invoiceId]?.invoiceNo ?? '—'}
                                  </TableCell>
                                  <TableCell className={productChrome.correctionMetaCell}>
                                    {lotCreatedLabel(item) ?? '—'}
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {item.receivedCount ?? '—'}
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {item.currentCount ?? '—'}
                                  </TableCell>
                                  <TableCell>
                                    {alreadyAdded ? (
                                      <Text variant="caption" color="secondary">
                                        On list
                                      </Text>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        leftIcon={<Icon icon={Plus} size="sm" />}
                                        onClick={() => addSearchLots([item])}
                                      >
                                        Add
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    </Stack>
                  )
                ) : null}
                {workbenchSource === 'invoice' ? (
                  <Box overflow="auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell className={surfaceChrome.historyActionCell}>
                            {' '}
                          </TableHeaderCell>
                          <TableHeaderCell>Invoice</TableHeaderCell>
                          <TableHeaderCell>Vendor</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell>Lines</TableHeaderCell>
                          <TableHeaderCell>Total</TableHeaderCell>
                          <TableHeaderCell></TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searching ? (
                          <TableLoadingRow colSpan={7} label="Searching…" />
                        ) : invoiceResults.length === 0 ? (
                          <TableEmptyRow colSpan={7} message="No results yet." />
                        ) : (
                          invoiceResults.map((inv) => {
                            const open = expandedInvoiceId === inv.id;
                            const lots = invoiceLotsById[inv.id] ?? [];
                            const loadingLines = loadingInvoiceId === inv.id;
                            return (
                              <Fragment key={inv.id}>
                                <TableRow>
                                  <TableCell className={surfaceChrome.historyActionCell}>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      aria-expanded={open}
                                      onClick={() => void toggleInvoiceExpand(inv.id)}
                                      rightIcon={
                                        <Icon icon={open ? ChevronUp : ChevronDown} size="sm" />
                                      }
                                    >
                                      {open ? 'Hide' : 'Lines'}
                                    </Button>
                                  </TableCell>
                                  <TableCell>{inv.invoiceNo}</TableCell>
                                  <TableCell>{vendorName(inv)}</TableCell>
                                  <TableCell>{dt(inv.invoiceDate)}</TableCell>
                                  <TableCell>{inv.lineCount}</TableCell>
                                  <TableCell>{money(inv.invoiceTotal)}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      loading={addingInvoiceId === inv.id}
                                      disabled={addingInvoiceId != null}
                                      leftIcon={<Icon icon={Plus} size="sm" />}
                                      onClick={() => void addInvoiceToList(inv.id)}
                                    >
                                      Add all
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {open ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={7}
                                      className={productChrome.historyExpandRow}
                                    >
                                      <Box className={surfaceChrome.historyExpandPanel}>
                                        {loadingLines ? (
                                          <CenteredLoader label="Loading lines…" />
                                        ) : lots.length === 0 ? (
                                          <EmptyState title="No inventory lines on this invoice." />
                                        ) : (
                                          <Table className={surfaceChrome.historyNestedTable}>
                                            <TableHead>
                                              <TableRow>
                                                <TableHeaderCell>Product</TableHeaderCell>
                                                <TableHeaderCell>Batch</TableHeaderCell>
                                                <TableHeaderCell>Created</TableHeaderCell>
                                                <TableHeaderCell
                                                  className={surfaceChrome.historyNumCell}
                                                >
                                                  Received
                                                </TableHeaderCell>
                                                <TableHeaderCell
                                                  className={surfaceChrome.historyNumCell}
                                                >
                                                  Current
                                                </TableHeaderCell>
                                                <TableHeaderCell></TableHeaderCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {lots.map((item) => {
                                                const inventoryId =
                                                  resolveInventoryDocumentId(item);
                                                const alreadyAdded =
                                                  inventoryId != null &&
                                                  countListIds.has(inventoryId);
                                                return (
                                                  <TableRow key={inventoryId ?? item.lotId}>
                                                    <TableCell>
                                                      <Text weight="semibold">
                                                        {item.name ?? 'Product'}
                                                      </Text>
                                                    </TableCell>
                                                    <TableCell
                                                      className={productChrome.correctionMetaCell}
                                                    >
                                                      {lotBatchNo(item) ?? '—'}
                                                    </TableCell>
                                                    <TableCell
                                                      className={productChrome.correctionMetaCell}
                                                    >
                                                      {lotCreatedLabel(item) ?? '—'}
                                                    </TableCell>
                                                    <TableCell
                                                      className={surfaceChrome.historyNumCell}
                                                    >
                                                      {item.receivedCount ?? '—'}
                                                    </TableCell>
                                                    <TableCell
                                                      className={surfaceChrome.historyNumCell}
                                                    >
                                                      {item.currentCount ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                      {alreadyAdded ? (
                                                        <Text variant="caption" color="secondary">
                                                          On list
                                                        </Text>
                                                      ) : (
                                                        <Button
                                                          type="button"
                                                          size="sm"
                                                          variant="ghost"
                                                          leftIcon={<Icon icon={Plus} size="sm" />}
                                                          onClick={() => addSearchLots([item])}
                                                        >
                                                          Add
                                                        </Button>
                                                      )}
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        )}
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ) : null}
                              </Fragment>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                ) : null}
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Inline align="center" justify="between">
                  <Stack gap="xs">
                    <Text variant="heading3" weight="semibold">
                      Count list
                    </Text>
                    <Text color="secondary" variant="caption">
                      Add lots from search, print the sheet, write counted qty on paper, then enter
                      it here and send to pending.
                    </Text>
                  </Stack>
                  <Inline gap="sm">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={correctionRows.length === 0}
                      leftIcon={<Icon icon={Printer} size="sm" />}
                      onClick={printCountSheet}
                    >
                      Print list
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={correctionRows.length === 0}
                      onClick={clearCountList}
                    >
                      Clear
                    </Button>
                  </Inline>
                </Inline>
                {correctionRows.length === 0 ? (
                  <EmptyState title="No lots on the count list yet." />
                ) : (
                  <Stack gap="md">
                    <Text color="secondary" variant="caption">
                      {correctionRows.length} lots on the list
                    </Text>
                    {correctionGroups.map((group) => (
                      <Box key={group.name} className={productChrome.correctionGroup}>
                        <Inline
                          gap="sm"
                          align="center"
                          className={productChrome.correctionGroupTitle}
                        >
                          <Text weight="semibold">{group.name}</Text>
                          {group.rows.length > 1 ? (
                            <Text color="secondary" variant="caption">
                              {group.rows.length} lots
                            </Text>
                          ) : null}
                        </Inline>
                        <Box overflow="auto">
                          <Table className={productChrome.correctionDraftTable}>
                            <TableHead>
                              <TableRow>
                                <TableHeaderCell>Invoice</TableHeaderCell>
                                <TableHeaderCell title="When this lot was recorded">
                                  Created
                                </TableHeaderCell>
                                {showBatchColumn ? <TableHeaderCell>Batch</TableHeaderCell> : null}
                                <TableHeaderCell
                                  className={surfaceChrome.historyNumCell}
                                  title="Quantity received on this stock-in"
                                >
                                  Received
                                </TableHeaderCell>
                                <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                  Current
                                </TableHeaderCell>
                                <TableHeaderCell>Counted qty</TableHeaderCell>
                                <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                  Change
                                </TableHeaderCell>
                                <TableHeaderCell
                                  className={surfaceChrome.historyImpactCell}
                                  title="Loss at cost when qty drops; gain at selling price when qty rises"
                                >
                                  Impact
                                </TableHeaderCell>
                                <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                  Cost
                                </TableHeaderCell>
                                <TableHeaderCell className={surfaceChrome.historyNumCell}>
                                  Selling
                                </TableHeaderCell>
                                <TableHeaderCell></TableHeaderCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {group.rows.map((row) => (
                                <TableRow key={row.inventoryId}>
                                  <TableCell className={productChrome.correctionMetaCell}>
                                    {row.invoiceNo ?? '—'}
                                  </TableCell>
                                  <TableCell className={productChrome.correctionMetaCell}>
                                    {row.createdAt ? formatShortDate(row.createdAt) : '—'}
                                  </TableCell>
                                  {showBatchColumn ? (
                                    <TableCell className={productChrome.correctionMetaCell}>
                                      {row.batchNo ?? '—'}
                                    </TableCell>
                                  ) : null}
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {row.receivedQty != null &&
                                    Number.isFinite(Number(row.receivedQty))
                                      ? row.receivedQty
                                      : '—'}
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {row.currentCount ?? '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      className={productChrome.correctionQtyInput}
                                      value={row.requestedCount}
                                      onChange={(e) =>
                                        setDraftQtyByInventoryId((prev) => ({
                                          ...prev,
                                          [row.inventoryId]: e.target.value,
                                        }))
                                      }
                                      placeholder="counted"
                                    />
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    <Text
                                      as="span"
                                      weight="semibold"
                                      className={qtyDeltaClass(row.qtyDeltaDisplay)}
                                    >
                                      {row.qtyDeltaDisplay}
                                    </Text>
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyImpactCell}>
                                    <Text
                                      as="span"
                                      weight="semibold"
                                      className={impactClass(row.impact.kind)}
                                    >
                                      {row.impact.text}
                                    </Text>
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {money(row.costPrice)}
                                  </TableCell>
                                  <TableCell className={surfaceChrome.historyNumCell}>
                                    {money(row.sellingPrice)}
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="sm"
                                      label={`Remove ${row.name ?? 'lot'} from count list`}
                                      onClick={() => removeFromCountList(row.inventoryId)}
                                    >
                                      <Icon icon={Trash2} size="sm" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Box>
                    ))}
                    <Inline>
                      <Button
                        type="button"
                        loading={submitting}
                        disabled={submitting || correctionRows.length === 0}
                        onClick={submitCorrection}
                      >
                        {submitting ? 'Submitting...' : 'Send to pending'}
                      </Button>
                    </Inline>
                  </Stack>
                )}
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Inline align="center" justify="between">
                  <Stack gap="xs">
                    <Text variant="heading3" weight="semibold">
                      Pending approvals
                    </Text>
                    {pendingLineRows.length > 0 ? (
                      <Text color="secondary" variant="caption">
                        {pendingLineRows.length} lines waiting
                      </Text>
                    ) : null}
                  </Stack>
                  {canApproveCorrections && pendingLineRows.length > 0 ? (
                    <Inline gap="sm">
                      <Button
                        type="button"
                        size="sm"
                        disabled={lineBusy != null}
                        loading={lineBusy === 'bulk:approve'}
                        onClick={() => void processAllPending('approve')}
                      >
                        {lineBusy === 'bulk:approve' ? 'Approving…' : 'Approve all'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={lineBusy != null}
                        loading={lineBusy === 'bulk:reject'}
                        onClick={() => void processAllPending('reject')}
                      >
                        {lineBusy === 'bulk:reject' ? 'Rejecting…' : 'Reject all'}
                      </Button>
                    </Inline>
                  ) : null}
                </Inline>
                {!canApproveCorrections ? (
                  <Text color="secondary">
                    Pending corrections are listed below. Only the shop owner or a manager can
                    approve or reject them.
                  </Text>
                ) : null}
                {pendingLoading ? (
                  <CenteredLoader label="Loading pending…" />
                ) : pendingLineRows.length === 0 ? (
                  <EmptyState title="No pending corrections." />
                ) : (
                  <Box overflow="auto">
                    <Table className={productChrome.correctionPendingTable}>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Product</TableHeaderCell>
                          <TableHeaderCell>Invoice</TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.historyNumCell}>
                            Prev
                          </TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.historyNumCell}>
                            Requested
                          </TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.historyNumCell}>
                            Change
                          </TableHeaderCell>
                          <TableHeaderCell>Submitted</TableHeaderCell>
                          {canApproveCorrections ? <TableHeaderCell></TableHeaderCell> : null}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingLineRows.map((row) => {
                          const prev = parseDisplayNumber(row.line.previousCurrentCount);
                          const req = Number(row.line.requestedCurrentCount);
                          const qtyOk = prev != null && Number.isFinite(req);
                          const changeDisplay = qtyOk ? formatQtyDelta(req, prev) : '—';
                          const invoiceLabel =
                            [row.invoiceNo, row.vendor].filter(Boolean).join(' · ') || '—';
                          return (
                            <TableRow key={`${row.correctionId}:${row.line.lineId}`}>
                              <TableCell>
                                <Text weight="semibold">
                                  {row.line.productName ?? row.line.inventoryId}
                                </Text>
                              </TableCell>
                              <TableCell className={productChrome.correctionMetaCell}>
                                {invoiceLabel}
                              </TableCell>
                              <TableCell className={surfaceChrome.historyNumCell}>
                                {row.line.previousCurrentCount ?? '—'}
                              </TableCell>
                              <TableCell className={surfaceChrome.historyNumCell}>
                                {row.line.requestedCurrentCount}
                              </TableCell>
                              <TableCell className={surfaceChrome.historyNumCell}>
                                <Text
                                  as="span"
                                  weight="semibold"
                                  className={qtyDeltaClass(changeDisplay)}
                                >
                                  {changeDisplay}
                                </Text>
                              </TableCell>
                              <TableCell className={productChrome.correctionMetaCell}>
                                {dt(row.submittedAt)}
                              </TableCell>
                              {canApproveCorrections ? (
                                <TableCell>
                                  <Inline gap="sm">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      disabled={lineBusy != null}
                                      loading={
                                        lineBusy ===
                                        `${row.correctionId}:${row.line.lineId}:approve`
                                      }
                                      onClick={() =>
                                        void processLine(
                                          row.correctionId,
                                          row.line.lineId,
                                          'approve',
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={lineBusy != null}
                                      loading={
                                        lineBusy === `${row.correctionId}:${row.line.lineId}:reject`
                                      }
                                      onClick={() =>
                                        void processLine(
                                          row.correctionId,
                                          row.line.lineId,
                                          'reject',
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </Inline>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Stack>
            </CardBody>
          </Card>
        </>
      ) : null}

      {activeTab === 'history' ? (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Stack gap="xs">
                <Text variant="heading3" weight="semibold">
                  Correction history
                </Text>
                <Box className={surfaceChrome.historyHint}>
                  Net impact includes{' '}
                  <Text as="span" weight="semibold">
                    approved
                  </Text>{' '}
                  lines only. Shrinkage is valued at{' '}
                  <Text as="span" weight="semibold">
                    cost
                  </Text>
                  ; extras at{' '}
                  <Text as="span" weight="semibold">
                    selling price
                  </Text>
                  . An asterisk (*) means some approved lines are missing pricing.
                </Box>
              </Stack>
              {historyLoading ? (
                <CenteredLoader label="Loading history…" />
              ) : history.length === 0 ? (
                <EmptyState title="No correction history yet." />
              ) : (
                <Table className={surfaceChrome.historyTable}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className={surfaceChrome.historyActionCell}>
                        {' '}
                      </TableHeaderCell>
                      <TableHeaderCell>Source</TableHeaderCell>
                      <TableHeaderCell>Vendor</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className={surfaceChrome.historyNumCell}>
                        Lines
                      </TableHeaderCell>
                      <TableHeaderCell className={surfaceChrome.historyNumCell}>
                        Approved
                      </TableHeaderCell>
                      <TableHeaderCell className={surfaceChrome.historyImpactCell}>
                        Net impact
                      </TableHeaderCell>
                      <TableHeaderCell className={surfaceChrome.historyDateCell}>
                        Created
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((c) => {
                      const approvedCount = c.lines.filter((l) => l.status === 'APPROVED').length;
                      const { total: netTotal, partial: netPartial } = summarizeApprovedNetImpact(
                        c,
                        historyInventoryById,
                      );
                      const open = expandedHistoryId === c.id;
                      return (
                        <Fragment key={c.id}>
                          <TableRow>
                            <TableCell className={surfaceChrome.historyActionCell}>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedHistoryId(open ? null : c.id)}
                                aria-expanded={open}
                                rightIcon={<Icon icon={open ? ChevronUp : ChevronDown} size="sm" />}
                              >
                                {open ? 'Hide' : 'Details'}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Text weight="semibold">{correctionSourceTitle(c)}</Text>
                            </TableCell>
                            <TableCell>{correctionVendorLabel(c)}</TableCell>
                            <TableCell>
                              <Badge variant={correctionStatusVariant(c.status)}>
                                {formatStatusLabel(c.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className={surfaceChrome.historyNumCell}>
                              {c.lines.length}
                            </TableCell>
                            <TableCell className={surfaceChrome.historyNumCell}>
                              {approvedCount}
                            </TableCell>
                            <TableCell className={surfaceChrome.historyImpactCell}>
                              {approvedCount === 0 ? (
                                '—'
                              ) : netTotal == null ? (
                                <Inline gap="none" align="center" justify="end">
                                  <Text as="span">—</Text>
                                  {netPartial ? (
                                    <Text as="span" className={surfaceChrome.estPartial}>
                                      *
                                    </Text>
                                  ) : null}
                                </Inline>
                              ) : (
                                <Inline gap="none" align="center" justify="end">
                                  <Text
                                    as="span"
                                    weight="semibold"
                                    className={
                                      netTotal > 0
                                        ? surfaceChrome.impactIncrease
                                        : netTotal < 0
                                        ? surfaceChrome.impactDecrease
                                        : undefined
                                    }
                                  >
                                    {money(netTotal)}
                                  </Text>
                                  {netPartial ? (
                                    <Text as="span" className={surfaceChrome.estPartial}>
                                      *
                                    </Text>
                                  ) : null}
                                </Inline>
                              )}
                            </TableCell>
                            <TableCell className={surfaceChrome.historyDateCell}>
                              {dt(c.createdAt)}
                            </TableCell>
                          </TableRow>
                          {open ? (
                            <TableRow>
                              <TableCell colSpan={8} className={productChrome.historyExpandRow}>
                                <Box className={surfaceChrome.historyExpandPanel}>
                                  <Stack gap="md">
                                    <Stack gap="xs">
                                      <Text as="p" className={surfaceChrome.historyExpandTitle}>
                                        Line breakdown
                                      </Text>
                                      <Text
                                        variant="caption"
                                        color="secondary"
                                        className={surfaceChrome.historyExpandHint}
                                      >
                                        Change = requested − previous. Impact uses cost for loss and
                                        selling price for gain. Rejected lines were not applied.
                                        {netPartial && approvedCount > 0
                                          ? ' Some impacts show “—” until pricing is available.'
                                          : null}
                                      </Text>
                                    </Stack>
                                    <Box overflow="auto">
                                      <Table className={surfaceChrome.historyNestedTable}>
                                        <TableHead>
                                          <TableRow>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyProductCell}
                                            >
                                              Product
                                            </TableHeaderCell>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyNumCell}
                                            >
                                              Prev
                                            </TableHeaderCell>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyNumCell}
                                            >
                                              Req
                                            </TableHeaderCell>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyNumCell}
                                            >
                                              Change
                                            </TableHeaderCell>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyImpactCell}
                                            >
                                              Impact
                                            </TableHeaderCell>
                                            <TableHeaderCell
                                              className={surfaceChrome.historyStatusCell}
                                            >
                                              Status
                                            </TableHeaderCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {c.lines.map((line) => {
                                            const inv = historyInventoryById[line.inventoryId];
                                            const prev = parseDisplayNumber(
                                              line.previousCurrentCount,
                                            );
                                            const req = Number(line.requestedCurrentCount);
                                            const qtyOk = prev != null && Number.isFinite(req);
                                            const qtyDisplay = qtyOk
                                              ? formatQtyDelta(req, prev)
                                              : '—';
                                            const impactUi = qtyOk
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

                                            return (
                                              <TableRow key={line.lineId}>
                                                <TableCell
                                                  className={surfaceChrome.historyProductCell}
                                                >
                                                  <Stack gap="xs" align="start">
                                                    <Text as="span" weight="semibold">
                                                      {line.productName ?? '—'}
                                                    </Text>
                                                    {inv?.batchNo ? (
                                                      <Text
                                                        as="span"
                                                        className={surfaceChrome.historyBatch}
                                                      >
                                                        Batch {inv.batchNo}
                                                      </Text>
                                                    ) : null}
                                                  </Stack>
                                                </TableCell>
                                                <TableCell className={surfaceChrome.historyNumCell}>
                                                  {line.previousCurrentCount ?? '—'}
                                                </TableCell>
                                                <TableCell className={surfaceChrome.historyNumCell}>
                                                  {line.requestedCurrentCount}
                                                </TableCell>
                                                <TableCell className={surfaceChrome.historyNumCell}>
                                                  <Text
                                                    as="span"
                                                    weight="semibold"
                                                    className={qtyDeltaClass(qtyDisplay)}
                                                  >
                                                    {qtyDisplay}
                                                  </Text>
                                                </TableCell>
                                                <TableCell
                                                  className={surfaceChrome.historyImpactCell}
                                                >
                                                  <Text
                                                    as="span"
                                                    weight="semibold"
                                                    className={impactClass(impactUi.kind)}
                                                  >
                                                    {impactUi.text}
                                                  </Text>
                                                </TableCell>
                                                <TableCell
                                                  className={surfaceChrome.historyStatusCell}
                                                >
                                                  <Stack gap="xs" align="start">
                                                    <Badge
                                                      variant={lineStatusVariant(line.status)}
                                                      className={surfaceChrome.historyStatusBadge}
                                                    >
                                                      {formatStatusLabel(line.status)}
                                                    </Badge>
                                                    {line.status === 'REJECTED' &&
                                                    line.rejectionReason ? (
                                                      <Text variant="caption" color="secondary">
                                                        {line.rejectionReason}
                                                      </Text>
                                                    ) : null}
                                                  </Stack>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </Box>
                                  </Stack>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </CardBody>
        </Card>
      ) : null}
    </Stack>
  );
}
