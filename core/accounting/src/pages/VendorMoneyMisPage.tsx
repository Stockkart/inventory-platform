import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  FormField,
  Inline,
  Input,
  PageHeader,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { inventoryApi } from '@inventory-platform/product';
import type { VendorPurchaseInvoiceDetail } from '@inventory-platform/product/types';
import { useNotify } from '@inventory-platform/session';
import type {
  VendorMoneyMisMoneyFilter,
  VendorMoneyMisParams,
  VendorMoneyMisResponse,
  VendorMoneyMisRow,
  VendorMoneyMisTxnType,
} from '@inventory-platform/accounting/types';
import { accountingApi } from '../api/accounting.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { AccountingTabs } from '../ui/AccountingTabs';
import {
  formatDateShort,
  formatDateTime,
  formatMoney,
  formatMoneyOrDash,
  todayLocalDate,
} from '../model/format';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: VendorMoneyMisTxnType; label: string }> = [
  { value: 'VENDOR_PURCHASE', label: 'Purchase' },
  { value: 'VENDOR_PAYMENT', label: 'Payment' },
  { value: 'VENDOR_RETURN', label: 'Return' },
  { value: 'VENDOR_CREDIT_CHARGE', label: 'Credit charge' },
];

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: VendorMoneyMisMoneyFilter; label: string }> = [
  { value: 'ALL', label: 'All money types' },
  { value: 'HAS_CASH', label: 'Has cash' },
  { value: 'HAS_ONLINE', label: 'Has online' },
  { value: 'HAS_CREDIT', label: 'Has credit' },
  { value: 'FULLY_PAID', label: 'Fully paid' },
  { value: 'MIXED', label: 'Mixed' },
];

const COL_COUNT = 9;

function monthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Monday of the local week containing `d`, as yyyy-mm-dd. */
function weekStart(d = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, '0');
  const dd = String(copy.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function rangeForPreset(preset: PeriodPreset): { from: string; to: string } {
  const to = todayLocalDate();
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') return { from: weekStart(), to };
  if (preset === 'month') return { from: monthStart(), to };
  return { from: monthStart(), to };
}

function againstLabel(row: VendorMoneyMisRow): string {
  if (row.againstRefNo) return row.againstRefNo;
  if (row.againstTxnId) return row.againstTxnId;
  return '—';
}

/** Cash + online paid on this row (credit is shown separately as "Credit Created"). */
function paymentAmount(row: VendorMoneyMisRow): number {
  return (row.cashAmount || 0) + (row.onlineAmount || 0);
}

/** Human label for how the row was paid, e.g. "Cash", "Online", "Cash + Online", "Credit". */
function paymentMode(row: VendorMoneyMisRow): string {
  const hasCash = row.cashAmount !== 0;
  const hasOnline = row.onlineAmount !== 0;
  if (hasCash && hasOnline) return 'Cash + Online';
  if (hasCash) return 'Cash';
  if (hasOnline) return 'Online';
  if (row.creditAmount !== 0) return 'Credit';
  return '—';
}

/** Invoice/bill total — only meaningful for purchases; blank for payments/returns/charges. */
function billAmount(row: VendorMoneyMisRow): number | null {
  return row.txnType === 'VENDOR_PURCHASE' ? row.totalAmount : null;
}

export function VendorMoneyMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const initial = rangeForPreset('month');

  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [txnTypes, setTxnTypes] = useState<VendorMoneyMisTxnType[]>([]);
  const [moneyFilter, setMoneyFilter] = useState<VendorMoneyMisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<VendorMoneyMisParams>({
    from: initial.from,
    to: initial.to,
    moneyFilter: 'ALL',
  });

  const [data, setData] = useState<VendorMoneyMisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<VendorPurchaseInvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.vendorMoneyMis(applied);
        if (!cancelled) {
          setData(res);
          setExpandedTxnId(null);
          setPurchaseDetail(null);
          setDetailError(null);
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Vendor Money MIS');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied, notifyError]);

  const queryParams = useMemo((): VendorMoneyMisParams => {
    return {
      from: fromInput,
      to: toInput,
      txnTypes: txnTypes.length > 0 ? txnTypes : undefined,
      moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
      q: qInput.trim() || undefined,
    };
  }, [fromInput, toInput, txnTypes, moneyFilter, qInput]);

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = rangeForPreset(next);
    setFromInput(range.from);
    setToInput(range.to);
    setApplied({
      from: range.from,
      to: range.to,
      txnTypes: txnTypes.length > 0 ? txnTypes : undefined,
      moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
      q: qInput.trim() || undefined,
    });
  }

  function handleSearch() {
    setApplied({
      from: fromInput,
      to: toInput,
      txnTypes: txnTypes.length > 0 ? txnTypes : undefined,
      moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
      q: qInput.trim() || undefined,
    });
  }

  function toggleTxnType(value: VendorMoneyMisTxnType) {
    setTxnTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await accountingApi.vendorMoneyMisExcel(queryParams);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await accountingApi.vendorMoneyMisPdf(queryParams);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  async function handleRowClick(row: VendorMoneyMisRow) {
    if (expandedTxnId === row.txnId) {
      setExpandedTxnId(null);
      setPurchaseDetail(null);
      setDetailError(null);
      return;
    }

    setExpandedTxnId(row.txnId);
    setPurchaseDetail(null);
    setDetailError(null);

    if (row.txnType !== 'VENDOR_PURCHASE') return;

    const invoiceId = row.sourceId?.trim() || row.txnId;
    if (!invoiceId) {
      setDetailError('No invoice id available for this purchase.');
      return;
    }

    setDetailLoading(true);
    try {
      const detail = await inventoryApi.getVendorPurchaseInvoice(invoiceId);
      setPurchaseDetail(detail);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load purchase invoice');
    } finally {
      setDetailLoading(false);
    }
  }

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader description="Vendor purchases, payments, returns, and credit — cash / online / credit split." />

      <Box className={accountingChrome.partiesFilterBar}>
        <Stack gap="sm">
          <Inline gap="sm" flexWrap>
            {(
              [
                ['today', 'Today'],
                ['week', 'This week'],
                ['month', 'This month'],
                ['custom', 'Custom'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={preset === key ? 'solid' : 'ghost'}
                size="sm"
                onClick={() => applyPreset(key)}
                disabled={loading}
              >
                {label}
              </Button>
            ))}
          </Inline>

          <Box className={accountingChrome.partiesFilterDates}>
            <Box className={accountingChrome.partiesFilterField}>
              <Text as="span" className={accountingChrome.partiesFilterLabel}>
                From
              </Text>
              <Input
                aria-label="From date"
                type="date"
                value={fromInput}
                onChange={(e) => {
                  setPreset('custom');
                  setFromInput(e.target.value);
                }}
                className={accountingChrome.tbAsOfInput}
                disabled={loading}
              />
            </Box>
            <Box className={accountingChrome.partiesFilterField}>
              <Text as="span" className={accountingChrome.partiesFilterLabel}>
                To
              </Text>
              <Input
                aria-label="To date"
                type="date"
                value={toInput}
                onChange={(e) => {
                  setPreset('custom');
                  setToInput(e.target.value);
                }}
                className={accountingChrome.tbAsOfInput}
                disabled={loading}
              />
            </Box>
            <FormField label="Money filter" htmlFor="vendor-mis-money-filter">
              <Select
                id="vendor-mis-money-filter"
                value={moneyFilter}
                options={MONEY_FILTER_OPTIONS}
                onChange={(e) => setMoneyFilter(e.target.value as VendorMoneyMisMoneyFilter)}
                disabled={loading}
              />
            </FormField>
            <FormField label="Search" htmlFor="vendor-mis-q">
              <Input
                id="vendor-mis-q"
                type="search"
                placeholder="Vendor, ref, txn id…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                disabled={loading}
              />
            </FormField>
            <Button
              type="button"
              variant="solid"
              onClick={handleSearch}
              loading={loading}
              disabled={loading || !fromInput || !toInput}
            >
              Search
            </Button>
          </Box>

          <Inline gap="md" flexWrap>
            {TXN_TYPE_OPTIONS.map((opt) => (
              <Checkbox
                key={opt.value}
                label={opt.label}
                checked={txnTypes.includes(opt.value)}
                onChange={() => toggleTxnType(opt.value)}
                disabled={loading}
              />
            ))}
          </Inline>

          <Inline gap="sm" flexWrap>
            <Button
              type="button"
              variant="solid"
              onClick={() => void handleDownload('excel')}
              loading={downloading === 'excel'}
              disabled={loading || downloading != null}
            >
              Download Excel
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={() => void handleDownload('pdf')}
              loading={downloading === 'pdf'}
              disabled={loading || downloading != null}
            >
              Download PDF
            </Button>
          </Inline>
        </Stack>
      </Box>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={COL_COUNT} label="Loading Vendor Money MIS…" />
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <Text color="secondary">No data for this period.</Text>
          </CardBody>
        </Card>
      ) : (
        <Stack gap="md">
          <Box className={accountingChrome.pnlKpiGrid}>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period cash
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(summary?.periodCashTotal)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period online
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(summary?.periodOnlineTotal)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period credit
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(summary?.periodCreditTotal)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Current payable
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(summary?.currentPayableTotal)}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              {rows.length === 0 ? (
                <Text as="p" className={accountingChrome.reportEmpty}>
                  No transactions in this period.
                </Text>
              ) : (
                <Table className={accountingChrome.tbTable}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Supplier</TableHeaderCell>
                      <TableHeaderCell>Transaction</TableHeaderCell>
                      <TableHeaderCell>Ref No.</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Bill Amount
                      </TableHeaderCell>
                      <TableHeaderCell>Payment Mode</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Payment Amount
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Credit Created
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Outstanding
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const open = expandedTxnId === row.txnId;
                      return (
                        <Fragment key={row.txnId}>
                          <TableRow
                            onClick={() => void handleRowClick(row)}
                            style={{ cursor: 'pointer' }}
                            aria-expanded={open}
                          >
                            <TableCell>{formatDateShort(row.txnDate)}</TableCell>
                            <TableCell>{row.vendorName || '—'}</TableCell>
                            <TableCell>
                              {row.opening ? 'Opening' : row.txnTypeLabel || row.txnType}
                            </TableCell>
                            <TableCell>{row.refNo || '—'}</TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoneyOrDash(billAmount(row))}
                            </TableCell>
                            <TableCell>{paymentMode(row)}</TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoneyOrDash(paymentAmount(row))}
                            </TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoneyOrDash(row.creditAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoney(row.balanceAfter)}
                            </TableCell>
                          </TableRow>
                          {open ? (
                            <TableRow>
                              <TableCell colSpan={COL_COUNT}>
                                <RowDetails
                                  row={row}
                                  detail={purchaseDetail}
                                  loading={detailLoading}
                                  error={detailError}
                                />
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Text variant="caption" color="secondary">
            Period {formatDateShort(data.from)} – {formatDateShort(data.to)} · {rows.length} row
            {rows.length === 1 ? '' : 's'}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

function RowDetails({
  row,
  detail,
  loading,
  error,
}: {
  row: VendorMoneyMisRow;
  detail: VendorPurchaseInvoiceDetail | null;
  loading: boolean;
  error: string | null;
}) {
  if (row.txnType === 'VENDOR_PURCHASE') {
    return (
      <Stack gap="sm" padding="sm">
        {loading ? <CenteredLoader label="Loading invoice…" size="sm" /> : null}
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {detail ? (
          <Stack gap="sm">
            <Text as="h4" className={accountingChrome.overviewSectionTitle}>
              Purchase invoice
            </Text>
            <Inline gap="lg" flexWrap>
              <DetailField label="Invoice no" value={detail.invoiceNo || '—'} />
              <DetailField label="Vendor" value={detail.vendorName || row.vendorName || '—'} />
              <DetailField
                label="Invoice date"
                value={formatDateShort(
                  detail.invoiceDate ? String(detail.invoiceDate).slice(0, 10) : null,
                )}
              />
              <DetailField label="Invoice total" value={`₹${formatMoney(detail.invoiceTotal)}`} />
              <DetailField label="Tax total" value={`₹${formatMoney(detail.taxTotal)}`} />
              <DetailField label="Lines" value={String(detail.lines?.length ?? 0)} />
            </Inline>
            <Inline gap="lg" flexWrap>
              <DetailField label="Cash (row)" value={`₹${formatMoney(row.cashAmount)}`} />
              <DetailField label="Online (row)" value={`₹${formatMoney(row.onlineAmount)}`} />
              <DetailField label="Credit (row)" value={`₹${formatMoney(row.creditAmount)}`} />
              <DetailField label="Posted" value={formatDateTime(row.postedAt)} />
            </Inline>
          </Stack>
        ) : !loading && !error ? (
          <RowKeyFields row={row} />
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack gap="sm" padding="sm">
      <RowKeyFields row={row} />
    </Stack>
  );
}

function RowKeyFields({ row }: { row: VendorMoneyMisRow }) {
  return (
    <Stack gap="sm">
      <Text as="h4" className={accountingChrome.overviewSectionTitle}>
        {row.txnTypeLabel || row.txnType}
      </Text>
      <Inline gap="lg" flexWrap>
        <DetailField label="Txn ID" value={row.txnId} />
        <DetailField label="Vendor" value={row.vendorName || '—'} />
        <DetailField label="Date" value={formatDateShort(row.txnDate)} />
        <DetailField label="Posted" value={formatDateTime(row.postedAt)} />
        <DetailField label="Ref no" value={row.refNo || '—'} />
        <DetailField label="Against" value={againstLabel(row)} />
        <DetailField label="Total" value={`₹${formatMoney(row.totalAmount)}`} />
        <DetailField label="Cash" value={`₹${formatMoney(row.cashAmount)}`} />
        <DetailField label="Online" value={`₹${formatMoney(row.onlineAmount)}`} />
        <DetailField label="Credit" value={`₹${formatMoney(row.creditAmount)}`} />
        <DetailField label="Balance after" value={`₹${formatMoney(row.balanceAfter)}`} />
        <DetailField label="Source" value={row.sourceType || '—'} />
      </Inline>
    </Stack>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text as="span" variant="caption" color="secondary">
        {label}
      </Text>
      <Text as="p">{value}</Text>
    </Box>
  );
}
