import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
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
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type {
  VendorMoneyMisMoneyFilter,
  VendorMoneyMisParams,
  VendorMoneyMisResponse,
  VendorMoneyMisTxnType,
} from '@inventory-platform/accounting/types';
import {
  FILTERABLE_VENDOR_MONEY_MIS_TXN_TYPES,
  VENDOR_MONEY_MIS_MONEY_FILTERS,
  VENDOR_MONEY_MIS_MONEY_FILTER_LABEL,
  VENDOR_MONEY_MIS_TXN_TYPE_LABEL,
} from '@inventory-platform/accounting/types';
import { accountingApi } from '../api/accounting.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

// Options derive from the shared constants so labels cannot drift from the API's own labels.
const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: VendorMoneyMisTxnType; label: string }> =
  FILTERABLE_VENDOR_MONEY_MIS_TXN_TYPES.map((value) => ({
    value,
    label: VENDOR_MONEY_MIS_TXN_TYPE_LABEL[value],
  }));

const ALL_TXN_TYPES = TXN_TYPE_OPTIONS.map((opt) => opt.value);

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: VendorMoneyMisMoneyFilter; label: string }> =
  VENDOR_MONEY_MIS_MONEY_FILTERS.map((value) => ({
    value,
    label: VENDOR_MONEY_MIS_MONEY_FILTER_LABEL[value],
  }));

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

function txnBadgeVariant(txnType: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (txnType === 'VENDOR_PURCHASE' || txnType === 'Opening') return 'success';
  if (txnType === 'VENDOR_PAYMENT') return 'info';
  if (txnType === 'VENDOR_RETURN') return 'warning';
  if (txnType === 'VENDOR_CREDIT_CHARGE') return 'danger';
  return 'neutral';
}

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

function toAppliedParams(
  from: string,
  to: string,
  txnTypes: VendorMoneyMisTxnType[],
  moneyFilter: VendorMoneyMisMoneyFilter,
  q: string,
): VendorMoneyMisParams {
  const allSelected =
    txnTypes.length === ALL_TXN_TYPES.length && ALL_TXN_TYPES.every((t) => txnTypes.includes(t));
  return {
    from,
    to,
    txnTypes: allSelected || txnTypes.length === 0 ? undefined : txnTypes,
    moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
    q: q.trim() || undefined,
  };
}

export function VendorMoneyMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const initial = rangeForPreset('month');

  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [txnTypes, setTxnTypes] = useState<VendorMoneyMisTxnType[]>([...ALL_TXN_TYPES]);
  const [moneyFilter, setMoneyFilter] = useState<VendorMoneyMisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<VendorMoneyMisParams>(() =>
    toAppliedParams(initial.from, initial.to, [...ALL_TXN_TYPES], 'ALL', ''),
  );

  const [data, setData] = useState<VendorMoneyMisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.vendorMoneyMis(applied);
        if (!cancelled) {
          setData(res);
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

  const draftParams = useMemo(
    () => toAppliedParams(fromInput, toInput, txnTypes, moneyFilter, qInput),
    [fromInput, toInput, txnTypes, moneyFilter, qInput],
  );

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = rangeForPreset(next);
    setFromInput(range.from);
    setToInput(range.to);
    setApplied(toAppliedParams(range.from, range.to, txnTypes, moneyFilter, qInput));
  }

  function handleSearch() {
    setApplied(draftParams);
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
        const result = await accountingApi.vendorMoneyMisExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await accountingApi.vendorMoneyMisPdf(applied);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <Stack gap="md">
      <PageHeader
        title="Vendor Transactions"
        description="Vendor purchases, payments, returns, and credit — cash / online / credit split."
        actions={
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
                variant={preset === key ? 'solid' : 'outline'}
                size="sm"
                onClick={() => applyPreset(key)}
                disabled={loading}
              >
                {label}
              </Button>
            ))}
          </Inline>
        }
      />

      <Card>
        <CardBody>
          <Stack gap="md">
            <Box className={accountingChrome.misFilterRow}>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  From date
                </Text>
                <Input
                  aria-label="From date"
                  type="date"
                  value={fromInput}
                  onChange={(e) => {
                    setPreset('custom');
                    setFromInput(e.target.value);
                  }}
                  className={accountingChrome.misFilterCompact}
                  disabled={loading}
                />
              </Box>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  To date
                </Text>
                <Input
                  aria-label="To date"
                  type="date"
                  value={toInput}
                  onChange={(e) => {
                    setPreset('custom');
                    setToInput(e.target.value);
                  }}
                  className={accountingChrome.misFilterCompact}
                  disabled={loading}
                />
              </Box>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  Money filter
                </Text>
                <Select
                  id="vendor-mis-money-filter"
                  value={moneyFilter}
                  options={MONEY_FILTER_OPTIONS}
                  onChange={(e) => setMoneyFilter(e.target.value as VendorMoneyMisMoneyFilter)}
                  disabled={loading}
                  className={accountingChrome.misFilterMoney}
                />
              </Box>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  Search
                </Text>
                <Input
                  id="vendor-mis-q"
                  type="search"
                  placeholder="Vendor, invoice, txn id…"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  disabled={loading}
                  className={accountingChrome.misFilterSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </Box>
              <Button
                type="button"
                variant="solid"
                size="sm"
                onClick={handleSearch}
                loading={loading}
                disabled={loading || !fromInput || !toInput}
              >
                Search
              </Button>
              <Box className={accountingChrome.misFilterActions}>
                <Button
                  type="button"
                  variant="solid"
                  size="sm"
                  onClick={() => void handleDownload('excel')}
                  loading={downloading === 'excel'}
                  disabled={loading || downloading != null}
                >
                  Download Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload('pdf')}
                  loading={downloading === 'pdf'}
                  disabled={loading || downloading != null}
                >
                  Download PDF
                </Button>
              </Box>
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
          </Stack>
        </CardBody>
      </Card>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={10} label="Loading vendor transactions…" />
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
          <Box className={accountingChrome.kpiGrid4}>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period cash
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.periodCashTotal)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period online
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.periodOnlineTotal)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Period credit
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.periodCreditTotal)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Current payable
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.currentPayableTotal)}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text as="h2" className={accountingChrome.overviewSectionTitle}>
                  Transactions
                </Text>
                {rows.length === 0 ? (
                  <Text as="p" className={accountingChrome.reportEmpty}>
                    No transactions in this period.
                  </Text>
                ) : (
                  <Table className={accountingChrome.misTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell>Supplier</TableHeaderCell>
                        <TableHeaderCell>Txn ID</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misTxnTypeCol}>
                          Transaction
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misInvoiceCol}>
                          Invoice
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Bill Amount
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Cash
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Online
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Credit
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Outstanding
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const typeLabel = row.opening ? 'Opening' : row.txnTypeLabel || row.txnType;
                        const fullTxnId = row.sourceId || row.txnId || '';
                        const shortTxnId =
                          fullTxnId.length > 4 ? `${fullTxnId.slice(0, 4)}...` : fullTxnId || '—';
                        return (
                          <TableRow key={`${row.txnType}-${fullTxnId}-${row.txnDate}`}>
                            <TableCell>{formatDateShort(row.txnDate)}</TableCell>
                            <TableCell>{row.vendorName || '—'}</TableCell>
                            <TableCell
                              className={accountingChrome.misTxnIdCol}
                              title={fullTxnId || undefined}
                            >
                              {shortTxnId}
                            </TableCell>
                            <TableCell className={accountingChrome.misTxnTypeCol}>
                              <Badge
                                variant={txnBadgeVariant(
                                  row.opening ? 'Opening' : String(row.txnType),
                                )}
                              >
                                {typeLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className={accountingChrome.misInvoiceCol}>
                              {row.refNo || '—'}
                            </TableCell>
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.totalAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.cashAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.onlineAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.creditAmount)}
                            </TableCell>
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Stack>
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
