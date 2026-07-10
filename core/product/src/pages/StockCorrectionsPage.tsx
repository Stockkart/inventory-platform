import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../api/inventory.api';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import type {
  InventoryCorrection,
  InventoryCorrectionLine,
  InventoryItem,
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceSummary,
} from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
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
} from '@inventory-platform/ui-kit';

const impactGainStyle = { fontWeight: 600 as const, color: '#047857' };
const impactLossStyle = { fontWeight: 600 as const, color: '#b91c1c' };
const estPartialStyle = {
  fontWeight: 500 as const,
  color: 'var(--text-secondary)',
  fontSize: '0.8125rem',
};
const historyCaptionStyle = {
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
  marginBottom: '0.5rem',
};

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

function qtyDeltaStyle(display: string): { fontWeight: 600; color: string } | undefined {
  if (display.startsWith('+')) return { fontWeight: 600, color: '#047857' };
  if (display.startsWith('-')) return { fontWeight: 600, color: '#b45309' };
  return undefined;
}

function impactStyle(
  kind: 'neutral' | 'loss' | 'gain' | 'na',
): { fontWeight: 600; color: string } | undefined {
  if (kind === 'loss') return impactLossStyle;
  if (kind === 'gain') return impactGainStyle;
  return undefined;
}

export function StockCorrectionsPage() {
  const { user } = useAuthStore();
  const canApproveCorrections = useShopAccessStore((s) => {
    const access = user?.shopId ? s.byShopId[user.shopId] : undefined;
    return access?.stockCorrection?.canApprove ?? false;
  });

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoiceResults, setInvoiceResults] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorPurchaseInvoiceDetail | null>(null);
  const [inventoryById, setInventoryById] = useState<Record<string, InventoryItem>>({});
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
            .filter((v): v is string => Boolean(v)),
        ),
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
        const correctedNum = draft.trim() === '' ? null : Number(draft.trim());
        const correctedValid = correctedNum != null && Number.isFinite(correctedNum);
        const costPrice = line.costPrice ?? inv?.costPrice ?? null;
        const sellingPrice = inv?.sellingPrice ?? inv?.priceToRetail ?? null;
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
            sellingPrice: sellingPrice != null ? Number(sellingPrice) : null,
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

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader
        title="Correct stock / price"
        description="Search invoices by product, barcode, invoice no, or vendor name; propose quantity corrections and approve lines; and review correction history."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Inline gap="none" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          role="tab"
          aria-selected={activeTab === 'workbench'}
          style={{
            marginBottom: -1,
            whiteSpace: 'nowrap',
            borderBottom: activeTab === 'workbench' ? '2px solid #3b82f6' : '2px solid transparent',
            borderRadius: 0,
          }}
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
          style={{
            marginBottom: -1,
            whiteSpace: 'nowrap',
            borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
            borderRadius: 0,
          }}
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
                <Box width="full" style={{ flex: 1, minWidth: '200px' }}>
                  <SearchInput
                    value={query}
                    onChange={setQuery}
                    onSearch={searchInvoices}
                    showSearchButton
                    placeholder="Product, barcode, invoice no, or vendor"
                  />
                </Box>
                <Box overflow="auto">
                  <Table>
                    <TableHead>
                      <TableRow>
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
                        <TableLoadingRow colSpan={6} label="Searching…" />
                      ) : invoiceResults.length === 0 ? (
                        <TableEmptyRow colSpan={6} message="No results yet." />
                      ) : (
                        invoiceResults.map((inv) => (
                          <TableRow key={inv.id}>
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
                                onClick={() => pickInvoice(inv.id)}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Create pending correction
                </Text>
                {!selectedInvoice ? (
                  <Text color="secondary">Select an invoice above first.</Text>
                ) : (
                  <>
                    <Text color="secondary" variant="caption">
                      <Text as="span" weight="semibold">
                        {selectedInvoice.invoiceNo}
                      </Text>
                      {' · '}
                      {vendorName(selectedInvoice)}
                      {' · '}
                      {correctionInvoiceSubtitle(selectedInvoice)}
                    </Text>
                    <Box overflow="auto">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeaderCell>Product</TableHeaderCell>
                            <TableHeaderCell>Batch</TableHeaderCell>
                            <TableHeaderCell title="Quantity received on this stock-in">
                              Received qty
                            </TableHeaderCell>
                            <TableHeaderCell>Current qty</TableHeaderCell>
                            <TableHeaderCell>Corrected qty</TableHeaderCell>
                            <TableHeaderCell>Change</TableHeaderCell>
                            <TableHeaderCell title="Loss at cost when qty drops; gain at selling price when qty rises">
                              Impact
                            </TableHeaderCell>
                            <TableHeaderCell>Cost price</TableHeaderCell>
                            <TableHeaderCell>Selling price</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {correctionRows.length === 0 ? (
                            <TableEmptyRow
                              colSpan={9}
                              message="No inventory lines found for correction."
                            />
                          ) : (
                            correctionRows.map((row) => (
                              <TableRow key={row.inventoryId}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.batchNo ?? '-'}</TableCell>
                                <TableCell>
                                  {row.receivedQty != null &&
                                  Number.isFinite(Number(row.receivedQty))
                                    ? row.receivedQty
                                    : '—'}
                                </TableCell>
                                <TableCell>{row.currentCount ?? '-'}</TableCell>
                                <TableCell>
                                  <Input
                                    style={{ width: '100px' }}
                                    value={row.requestedCount}
                                    onChange={(e) =>
                                      setDraftQtyByInventoryId((prev) => ({
                                        ...prev,
                                        [row.inventoryId]: e.target.value,
                                      }))
                                    }
                                    placeholder="new qty"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Text
                                    as="span"
                                    weight="semibold"
                                    style={qtyDeltaStyle(row.qtyDeltaDisplay)}
                                  >
                                    {row.qtyDeltaDisplay}
                                  </Text>
                                </TableCell>
                                <TableCell>
                                  <Text
                                    as="span"
                                    weight="semibold"
                                    style={impactStyle(row.impact.kind)}
                                  >
                                    {row.impact.text}
                                  </Text>
                                </TableCell>
                                <TableCell>{money(row.costPrice)}</TableCell>
                                <TableCell>{money(row.sellingPrice)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                    <Inline>
                      <Button
                        type="button"
                        loading={submitting}
                        disabled={submitting}
                        onClick={submitCorrection}
                      >
                        {submitting ? 'Submitting...' : 'Send to pending'}
                      </Button>
                    </Inline>
                  </>
                )}
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Pending approvals
                </Text>
                {!canApproveCorrections ? (
                  <Text color="secondary">
                    Pending corrections are listed below. Only the shop owner or a manager can
                    approve or reject them.
                  </Text>
                ) : null}
                {pendingLoading ? (
                  <CenteredLoader label="Loading pending…" />
                ) : pending.length === 0 ? (
                  <EmptyState title="No pending corrections." />
                ) : (
                  pending.map((c) => (
                    <Box key={c.id} border rounded="md" padding="sm">
                      <Stack gap="sm">
                        <Text color="secondary" variant="caption">
                          <Text as="span" weight="semibold">
                            {c.invoiceNo ?? 'No invoice'}
                          </Text>
                          {' · '}
                          {c.vendorName ?? 'Unknown vendor'}
                          {' · '}
                          {dt(c.createdAt)}
                        </Text>
                        <Box overflow="auto">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableHeaderCell>Product</TableHeaderCell>
                                <TableHeaderCell>Prev qty</TableHeaderCell>
                                <TableHeaderCell>Requested qty</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell></TableHeaderCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {c.lines.map((line) => (
                                <TableRow key={line.lineId}>
                                  <TableCell>{line.productName ?? line.inventoryId}</TableCell>
                                  <TableCell>{line.previousCurrentCount ?? '-'}</TableCell>
                                  <TableCell>{line.requestedCurrentCount}</TableCell>
                                  <TableCell>{line.status}</TableCell>
                                  <TableCell>
                                    {line.status === 'PENDING' && canApproveCorrections ? (
                                      <Inline gap="sm">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          disabled={lineBusy != null}
                                          loading={lineBusy === `${c.id}:${line.lineId}:approve`}
                                          onClick={() => processLine(c.id, line.lineId, 'approve')}
                                        >
                                          {lineBusy === `${c.id}:${line.lineId}:approve`
                                            ? 'Approving...'
                                            : 'Approve'}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={lineBusy != null}
                                          loading={lineBusy === `${c.id}:${line.lineId}:reject`}
                                          onClick={() => processLine(c.id, line.lineId, 'reject')}
                                        >
                                          {lineBusy === `${c.id}:${line.lineId}:reject`
                                            ? 'Rejecting...'
                                            : 'Reject'}
                                        </Button>
                                      </Inline>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Stack>
                    </Box>
                  ))
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
              <Text variant="heading3" weight="semibold">
                Correction history
              </Text>
              <Text variant="caption" color="secondary" style={historyCaptionStyle}>
                Net impact sums{' '}
                <Text as="span" weight="semibold">
                  approved
                </Text>{' '}
                lines only — shrinkage valued at{' '}
                <Text as="span" weight="semibold">
                  cost
                </Text>
                , extras at{' '}
                <Text as="span" weight="semibold">
                  selling price
                </Text>{' '}
                (from current inventory pricing when you open this tab).
              </Text>
              {historyLoading ? (
                <CenteredLoader label="Loading history…" />
              ) : history.length === 0 ? (
                <EmptyState title="No correction history yet." />
              ) : (
                <Box overflow="auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell></TableHeaderCell>
                        <TableHeaderCell>Invoice</TableHeaderCell>
                        <TableHeaderCell>Vendor</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Lines</TableHeaderCell>
                        <TableHeaderCell>Approved</TableHeaderCell>
                        <TableHeaderCell>Net impact</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
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
                              <TableCell>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  style={{ fontSize: '0.8125rem' }}
                                  onClick={() => setExpandedHistoryId(open ? null : c.id)}
                                  aria-expanded={open}
                                >
                                  {open ? 'Hide' : 'Details'}
                                </Button>
                              </TableCell>
                              <TableCell>{c.invoiceNo ?? '-'}</TableCell>
                              <TableCell>{c.vendorName ?? '-'}</TableCell>
                              <TableCell>{c.status}</TableCell>
                              <TableCell>{c.lines.length}</TableCell>
                              <TableCell>{approvedCount}</TableCell>
                              <TableCell style={{ fontWeight: 600 }}>
                                {approvedCount === 0 ? (
                                  '—'
                                ) : netTotal == null ? (
                                  <Inline gap="none" align="center">
                                    <Text as="span">—</Text>
                                    {netPartial ? (
                                      <Text as="span" style={estPartialStyle}>
                                        {' '}
                                        *
                                      </Text>
                                    ) : null}
                                  </Inline>
                                ) : (
                                  <Inline gap="none" align="center">
                                    <Text
                                      as="span"
                                      weight="semibold"
                                      style={
                                        netTotal > 0
                                          ? impactGainStyle
                                          : netTotal < 0
                                          ? impactLossStyle
                                          : undefined
                                      }
                                    >
                                      {money(netTotal)}
                                    </Text>
                                    {netPartial ? (
                                      <Text as="span" style={estPartialStyle}>
                                        {' '}
                                        *
                                      </Text>
                                    ) : null}
                                  </Inline>
                                )}
                              </TableCell>
                              <TableCell>{dt(c.createdAt)}</TableCell>
                            </TableRow>
                            {open ? (
                              <TableRow>
                                <TableCell
                                  colSpan={8}
                                  style={{
                                    padding: '0.75rem 0.5rem',
                                    borderTop: '1px dashed var(--border-color)',
                                  }}
                                >
                                  <Stack gap="sm">
                                    <Text
                                      variant="caption"
                                      color="secondary"
                                      style={historyCaptionStyle}
                                    >
                                      Line breakdown: change vs quantity before correction. Impact
                                      uses the same rules as Workbench (loss at cost, gain at
                                      selling price). Rejected lines were not applied. An asterisk
                                      on net impact means some approved lines lack pricing on file
                                      or were excluded from the total.
                                      {netPartial && approvedCount > 0 ? (
                                        <>
                                          {' '}
                                          Some rows above may show “—” for impact until pricing
                                          loads or is filled in.
                                        </>
                                      ) : null}
                                    </Text>
                                    <Box overflow="auto">
                                      <Table>
                                        <TableHead>
                                          <TableRow>
                                            <TableHeaderCell>Product</TableHeaderCell>
                                            <TableHeaderCell>Prev qty</TableHeaderCell>
                                            <TableHeaderCell>Requested</TableHeaderCell>
                                            <TableHeaderCell>Change</TableHeaderCell>
                                            <TableHeaderCell>Impact</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
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

                                            const statusHint =
                                              line.status === 'REJECTED'
                                                ? ' (not applied)'
                                                : line.status !== 'APPROVED'
                                                ? ''
                                                : '';
                                            return (
                                              <TableRow key={line.lineId}>
                                                <TableCell>
                                                  {line.productName ?? '—'}{' '}
                                                  {inv?.batchNo ? (
                                                    <Text as="span" style={estPartialStyle}>
                                                      · batch {inv.batchNo}
                                                    </Text>
                                                  ) : null}
                                                </TableCell>
                                                <TableCell>
                                                  {line.previousCurrentCount ?? '—'}
                                                </TableCell>
                                                <TableCell>{line.requestedCurrentCount}</TableCell>
                                                <TableCell>
                                                  <Text
                                                    as="span"
                                                    weight="semibold"
                                                    style={qtyDeltaStyle(qtyDisplay)}
                                                  >
                                                    {qtyDisplay}
                                                  </Text>
                                                </TableCell>
                                                <TableCell>
                                                  <Text
                                                    as="span"
                                                    weight="semibold"
                                                    style={impactStyle(impactUi.kind)}
                                                  >
                                                    {impactUi.text}
                                                  </Text>
                                                </TableCell>
                                                <TableCell
                                                  style={{
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.8125rem',
                                                  }}
                                                >
                                                  {line.status}
                                                  {statusHint}
                                                  {line.rejectionReason &&
                                                  line.status === 'REJECTED' ? (
                                                    <> — {line.rejectionReason}</>
                                                  ) : null}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </Box>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          </CardBody>
        </Card>
      ) : null}
    </Stack>
  );
}
