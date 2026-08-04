import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  DropdownMenu,
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
  SalesMisExportScope,
  SalesMisMoneyFilter,
  SalesMisParams,
  SalesMisResponse,
  SalesMisTxnType,
} from '@inventory-platform/accounting/types';
import {
  FILTERABLE_SALES_MIS_TXN_TYPES,
  SALES_MIS_EXPORT_SCOPES,
  SALES_MIS_EXPORT_SCOPE_LABEL,
  SALES_MIS_MONEY_FILTERS,
  SALES_MIS_MONEY_FILTER_LABEL,
  SALES_MIS_TXN_TYPE_LABEL,
} from '@inventory-platform/accounting/types';
import { accountingApi } from '../api/accounting.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

// Options derive from the shared constants so labels cannot drift from the API's own labels.
const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: SalesMisTxnType; label: string }> =
  FILTERABLE_SALES_MIS_TXN_TYPES.map((value) => ({
    value,
    label: SALES_MIS_TXN_TYPE_LABEL[value],
  }));

const ALL_TXN_TYPES = TXN_TYPE_OPTIONS.map((opt) => opt.value);

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: SalesMisMoneyFilter; label: string }> =
  SALES_MIS_MONEY_FILTERS.map((value) => ({
    value,
    label: SALES_MIS_MONEY_FILTER_LABEL[value],
  }));

/** Each download button opens this list: a file holds one table, so the user picks which. */
const EXPORT_SCOPE_OPTIONS: ReadonlyArray<{ value: SalesMisExportScope; label: string }> =
  SALES_MIS_EXPORT_SCOPES.map((value) => ({
    value,
    label: SALES_MIS_EXPORT_SCOPE_LABEL[value],
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
  if (txnType === 'SALE' || txnType === 'Opening') return 'success';
  if (txnType === 'CUSTOMER_RECEIPT') return 'info';
  if (txnType === 'SALES_RETURN') return 'warning';
  if (txnType === 'CUSTOMER_CREDIT_CHARGE') return 'danger';
  return 'neutral';
}

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

function toAppliedParams(
  from: string,
  to: string,
  txnTypes: SalesMisTxnType[],
  moneyFilter: SalesMisMoneyFilter,
  q: string,
): SalesMisParams {
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

export function SalesMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const initial = rangeForPreset('month');

  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [txnTypes, setTxnTypes] = useState<SalesMisTxnType[]>([...ALL_TXN_TYPES]);
  const [moneyFilter, setMoneyFilter] = useState<SalesMisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<SalesMisParams>(() =>
    toAppliedParams(initial.from, initial.to, [...ALL_TXN_TYPES], 'ALL', ''),
  );

  const [data, setData] = useState<SalesMisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);
  /** Which download button has its table-picker open, if any. */
  const [openMenu, setOpenMenu] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.salesMis(applied);
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Sales MIS');
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

  function toggleTxnType(value: SalesMisTxnType) {
    setTxnTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function handleDownload(kind: 'excel' | 'pdf', scope: SalesMisExportScope) {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await accountingApi.salesMisExcel(applied, scope);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await accountingApi.salesMisPdf(applied, scope);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  function exportMenuItems(kind: 'excel' | 'pdf') {
    return EXPORT_SCOPE_OPTIONS.map((opt) => ({
      id: `${kind}-${opt.value}`,
      label: opt.label,
      onSelect: () => void handleDownload(kind, opt.value),
    }));
  }

  const summary = data?.summary;
  const dailyRows = data?.dailyRows ?? [];
  const rows = data?.rows ?? [];

  return (
    <Stack gap="md">
      <PageHeader
        title="Sales Transactions"
        description="Customer sales, receipts, returns, and credit — cash / online / credit split."
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
                  id="sales-mis-money-filter"
                  value={moneyFilter}
                  options={MONEY_FILTER_OPTIONS}
                  onChange={(e) => setMoneyFilter(e.target.value as SalesMisMoneyFilter)}
                  disabled={loading}
                  className={accountingChrome.misFilterMoney}
                />
              </Box>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  Search
                </Text>
                <Input
                  id="sales-mis-q"
                  type="search"
                  placeholder="Customer, invoice, txn id…"
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
                <DropdownMenu
                  open={openMenu === 'excel'}
                  onOpenChange={(next) => setOpenMenu(next ? 'excel' : null)}
                  items={exportMenuItems('excel')}
                  trigger={
                    <Button
                      type="button"
                      variant="solid"
                      size="sm"
                      loading={downloading === 'excel'}
                      disabled={loading || downloading != null}
                    >
                      Download Excel ▾
                    </Button>
                  }
                />
                <DropdownMenu
                  open={openMenu === 'pdf'}
                  onOpenChange={(next) => setOpenMenu(next ? 'pdf' : null)}
                  items={exportMenuItems('pdf')}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={downloading === 'pdf'}
                      disabled={loading || downloading != null}
                    >
                      Download PDF ▾
                    </Button>
                  }
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
                <TableLoadingRow colSpan={10} label="Loading sales transactions…" />
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
                Current receivable
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.currentReceivableTotal)}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text as="h2" className={accountingChrome.overviewSectionTitle}>
                  Daily sales
                </Text>
                {dailyRows.length === 0 ? (
                  <Text as="p" className={accountingChrome.reportEmpty}>
                    No sales in this period.
                  </Text>
                ) : (
                  <Table className={accountingChrome.misTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Total Sale
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Online
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Cash
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Credit
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          MTD
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyRows.map((day) => (
                        <TableRow key={day.txnDate}>
                          <TableCell>{formatDateShort(day.txnDate)}</TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(day.totalSale)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(day.onlineAmount)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(day.cashAmount)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(day.creditAmount)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(day.monthToDateTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Stack>
            </CardBody>
          </Card>

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
                        <TableHeaderCell>Customer</TableHeaderCell>
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
                            <TableCell>{row.customerName || '—'}</TableCell>
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
