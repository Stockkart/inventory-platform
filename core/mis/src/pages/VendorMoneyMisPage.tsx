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
  PaginationBar,
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
  MisMoneyFilter,
  MisMoneyReportParams,
  MisMoneyReportResponse,
  MisVendorTxnType,
} from '@inventory-platform/mis/types';
import {
  FILTERABLE_MIS_VENDOR_TXN_TYPES,
  MIS_MONEY_FILTERS,
  MIS_MONEY_FILTER_LABEL,
  MIS_VENDOR_TXN_TYPE_LABEL,
} from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';
import { MIS_DEFAULT_PAGE_SIZE, MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';
import { shortenTxnId } from '../model/txnId';
import { MisExportButtons } from '../ui/MisExportButtons';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: MisVendorTxnType; label: string }> =
  FILTERABLE_MIS_VENDOR_TXN_TYPES.map((value) => ({
    value,
    label: MIS_VENDOR_TXN_TYPE_LABEL[value],
  }));

const ALL_TXN_TYPES = TXN_TYPE_OPTIONS.map((opt) => opt.value);

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: MisMoneyFilter; label: string }> =
  MIS_MONEY_FILTERS.map((value) => ({
    value,
    label: MIS_MONEY_FILTER_LABEL[value],
  }));

function monthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

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

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

function toAppliedParams(
  from: string,
  to: string,
  txnTypes: MisVendorTxnType[],
  moneyFilter: MisMoneyFilter,
  q: string,
): MisMoneyReportParams {
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
  const [txnTypes, setTxnTypes] = useState<MisVendorTxnType[]>([...ALL_TXN_TYPES]);
  const [moneyFilter, setMoneyFilter] = useState<MisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<MisMoneyReportParams>(() =>
    toAppliedParams(initial.from, initial.to, [...ALL_TXN_TYPES], 'ALL', ''),
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(MIS_DEFAULT_PAGE_SIZE);

  const [data, setData] = useState<MisMoneyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await misApi.vendorMoney({ ...applied, page, size: pageSize });
        if (!cancelled) setData(res);
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
  }, [applied, page, pageSize, notifyError]);

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
    setPage(0);
    setApplied(toAppliedParams(range.from, range.to, txnTypes, moneyFilter, qInput));
  }

  function handleSearch() {
    setPage(0);
    setApplied(draftParams);
  }

  function toggleTxnType(value: MisVendorTxnType) {
    setTxnTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await misApi.vendorMoneyExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await misApi.vendorMoneyPdf(applied);
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
  const totalItems = data?.totalItems ?? 0;
  const totalPages = misTotalPages(totalItems, pageSize);

  return (
    <Stack gap="md">
      <PageHeader
        title="Vendor Money"
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
                  onChange={(e) => setMoneyFilter(e.target.value as MisMoneyFilter)}
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
                <MisExportButtons
                  downloading={downloading}
                  disabled={loading}
                  onExcel={() => void handleDownload('excel')}
                  onPdf={() => void handleDownload('pdf')}
                />
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
                {rupee(summary?.currentBalanceTotal)}
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
                        <TableHeaderCell className={accountingChrome.misDateCol}>
                          Date
                        </TableHeaderCell>
                        <TableHeaderCell>Supplier</TableHeaderCell>
                        <TableHeaderCell>Txn ID</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misTxnTypeCol}>
                          Transaction
                        </TableHeaderCell>
                        <TableHeaderCell>Invoice</TableHeaderCell>
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
                        const fullTxnId = row.txnId || row.sourceId || '';
                        return (
                          <TableRow key={`${row.txnType}-${fullTxnId}-${row.txnDate}`}>
                            <TableCell className={accountingChrome.misDateCol}>
                              {formatDateShort(row.txnDate)}
                            </TableCell>
                            <TableCell className={accountingChrome.misPartyCol}>
                              {row.partyName || '—'}
                            </TableCell>
                            <TableCell
                              className={accountingChrome.misTxnIdCol}
                              title={fullTxnId || undefined}
                            >
                              <Text as="span" className={accountingChrome.misTxnId}>
                                {shortenTxnId(fullTxnId)}
                              </Text>
                            </TableCell>
                            <TableCell className={accountingChrome.misTxnTypeCol}>
                              <Badge variant="neutral">{typeLabel}</Badge>
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
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  disabled={loading}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  pageSizeOptions={MIS_PAGE_SIZE_OPTIONS}
                  onPageSizeChange={(n) => {
                    setPage(0);
                    setPageSize(n);
                  }}
                  aria-label="Vendor Money pages"
                />
              </Stack>
            </CardBody>
          </Card>

          <Text variant="caption" color="secondary">
            Period {formatDateShort(data.from)} – {formatDateShort(data.to)} · {totalItems} row
            {totalItems === 1 ? '' : 's'}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
