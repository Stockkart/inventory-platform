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
  PartyMoneyMisMoneyFilter,
  PartyMoneyMisParams,
  PartyMoneyMisResponse,
  PartyMoneyMisRow,
  PartyMoneyMisTxnType,
} from '@inventory-platform/accounting/types';
import { accountingApi } from '../api/accounting.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateShort, formatDateTime, formatMoney, todayLocalDate } from '../model/format';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: PartyMoneyMisTxnType; label: string }> = [
  { value: 'VENDOR_PURCHASE', label: 'Purchase' },
  { value: 'VENDOR_PAYMENT', label: 'Payment' },
  { value: 'VENDOR_RETURN', label: 'Return' },
  { value: 'VENDOR_CREDIT_CHARGE', label: 'Credit charge' },
];

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: PartyMoneyMisMoneyFilter; label: string }> = [
  { value: 'ALL', label: 'All money types' },
  { value: 'HAS_CASH', label: 'Has cash' },
  { value: 'HAS_ONLINE', label: 'Has online' },
  { value: 'HAS_CREDIT', label: 'Has credit' },
  { value: 'FULLY_PAID', label: 'Fully paid' },
  { value: 'MIXED', label: 'Mixed' },
];

const COL_COUNT = 11;

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

function againstLabel(row: PartyMoneyMisRow): string {
  if (row.againstRefNo) return row.againstRefNo;
  if (row.againstTxnId) return row.againstTxnId;
  return '—';
}

export function VendorMoneyMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const initial = rangeForPreset('month');

  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [txnTypes, setTxnTypes] = useState<PartyMoneyMisTxnType[]>([]);
  const [moneyFilter, setMoneyFilter] = useState<PartyMoneyMisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<PartyMoneyMisParams>({
    side: 'VENDOR',
    from: initial.from,
    to: initial.to,
    moneyFilter: 'ALL',
  });

  const [data, setData] = useState<PartyMoneyMisResponse | null>(null);
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
        const res = await accountingApi.partyMoneyMis(applied);
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

  const queryParams = useMemo((): PartyMoneyMisParams => {
    return {
      side: 'VENDOR',
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
      side: 'VENDOR',
      from: range.from,
      to: range.to,
      txnTypes: txnTypes.length > 0 ? txnTypes : undefined,
      moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
      q: qInput.trim() || undefined,
    });
  }

  function handleSearch() {
    setApplied({
      side: 'VENDOR',
      from: fromInput,
      to: toInput,
      txnTypes: txnTypes.length > 0 ? txnTypes : undefined,
      moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
      q: qInput.trim() || undefined,
    });
  }

  function toggleTxnType(value: PartyMoneyMisTxnType) {
    setTxnTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await accountingApi.partyMoneyMisExcel(queryParams);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await accountingApi.partyMoneyMisPdf(queryParams);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  async function handleRowClick(row: PartyMoneyMisRow) {
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
                onChange={(e) => setMoneyFilter(e.target.value as PartyMoneyMisMoneyFilter)}
                disabled={loading}
              />
            </FormField>
            <FormField label="Search" htmlFor="vendor-mis-q">
              <Input
                id="vendor-mis-q"
                type="search"
                placeholder="Party, ref, txn id…"
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
                      <TableHeaderCell>Party</TableHeaderCell>
                      <TableHeaderCell>Txn ID</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Ref No</TableHeaderCell>
                      <TableHeaderCell>Against</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>Total</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>Cash</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Online
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Credit
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.tbNumCol}>
                        Balance
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
                            <TableCell>{row.partyName || '—'}</TableCell>
                            <TableCell>{row.txnId}</TableCell>
                            <TableCell>
                              {row.opening ? 'Opening' : row.txnTypeLabel || row.txnType}
                            </TableCell>
                            <TableCell>{row.refNo || '—'}</TableCell>
                            <TableCell>{againstLabel(row)}</TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoney(row.totalAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoney(row.cashAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoney(row.onlineAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.tbNumCol}>
                              {formatMoney(row.creditAmount)}
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
  row: PartyMoneyMisRow;
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
              <DetailField label="Vendor" value={detail.vendorName || row.partyName || '—'} />
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

function RowKeyFields({ row }: { row: PartyMoneyMisRow }) {
  return (
    <Stack gap="sm">
      <Text as="h4" className={accountingChrome.overviewSectionTitle}>
        {row.txnTypeLabel || row.txnType}
      </Text>
      <Inline gap="lg" flexWrap>
        <DetailField label="Txn ID" value={row.txnId} />
        <DetailField label="Party" value={row.partyName || '—'} />
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
