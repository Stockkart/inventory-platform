import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  PageHeader,
  PaginationBar,
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
import type { MisSalesReportParams, MisSalesReportResponse } from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';
import { MIS_DEFAULT_PAGE_SIZE, MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';
import { MisExportButtons } from '../ui/MisExportButtons';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

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

function toAppliedParams(from: string, to: string, q: string): MisSalesReportParams {
  return {
    from,
    to,
    q: q.trim() || undefined,
  };
}

export function SalesMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const initial = rangeForPreset('month');

  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<MisSalesReportParams>(() =>
    toAppliedParams(initial.from, initial.to, ''),
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(MIS_DEFAULT_PAGE_SIZE);

  const [data, setData] = useState<MisSalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await misApi.sales({ ...applied, page, size: pageSize });
        if (!cancelled) setData(res);
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
  }, [applied, page, pageSize, notifyError]);

  const draftParams = useMemo(
    () => toAppliedParams(fromInput, toInput, qInput),
    [fromInput, toInput, qInput],
  );

  function applyPreset(next: PeriodPreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = rangeForPreset(next);
    setFromInput(range.from);
    setToInput(range.to);
    setPage(0);
    setApplied(toAppliedParams(range.from, range.to, qInput));
  }

  function handleSearch() {
    setPage(0);
    setApplied(draftParams);
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await misApi.salesExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await misApi.salesPdf(applied);
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
        title="Sales"
        description="Sales, refunds, tender split, and profit for the selected period."
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
                Search
              </Text>
              <Input
                id="sales-mis-q"
                type="search"
                placeholder="Invoice, customer…"
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
        </CardBody>
      </Card>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={10} label="Loading sales…" />
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
                Net sales
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.netSales)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Gross
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.gross)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Profit
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.profit)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Orders
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {summary?.count ?? 0}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text as="h2" className={accountingChrome.overviewSectionTitle}>
                  Sales
                </Text>
                {rows.length === 0 ? (
                  <Text as="p" className={accountingChrome.reportEmpty}>
                    No sales in this period.
                  </Text>
                ) : (
                  <Table className={accountingChrome.misTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell className={accountingChrome.misDateCol}>
                          Date
                        </TableHeaderCell>
                        <TableHeaderCell>Invoice</TableHeaderCell>
                        <TableHeaderCell>Customer</TableHeaderCell>
                        <TableHeaderCell>Payment</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Gross
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Tax
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
                          Profit
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.saleId}>
                          <TableCell className={accountingChrome.misDateCol}>
                            {formatDateShort(row.date)}
                          </TableCell>
                          <TableCell className={accountingChrome.misTxnIdCol}>
                            <span className={accountingChrome.misTxnId}>
                              {row.invoiceNo || '—'}
                            </span>
                          </TableCell>
                          <TableCell className={accountingChrome.misPartyCol}>
                            {row.customer || '—'}
                          </TableCell>
                          <TableCell className={accountingChrome.misTxnTypeCol}>
                            <Badge variant="neutral">{row.paymentMethod || '—'}</Badge>
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.grandTotal)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.tax)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.cash)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.online)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.credit)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.profit)}
                          </TableCell>
                        </TableRow>
                      ))}
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
                  aria-label="Sales pages"
                />
              </Stack>
            </CardBody>
          </Card>

          <Text variant="caption" color="secondary">
            Period {formatDateShort(data.from)} – {formatDateShort(data.to)} · {totalItems} row
            {totalItems === 1 ? '' : 's'}
            {summary && summary.refundCount > 0
              ? ` · ${summary.refundCount} refund${summary.refundCount === 1 ? '' : 's'} (${rupee(
                  summary.refundAmount,
                )})`
              : ''}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
