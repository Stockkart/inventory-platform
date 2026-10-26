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
import type {
  MisBankSummaryReportParams,
  MisBankSummaryReportResponse,
} from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatMoney, formatDateShort } from '../model/format';
import { MIS_DEFAULT_PAGE_SIZE, MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';
import { misRangeForPreset, type MisPeriodPreset } from '../model/period';
import { MisExportButtons } from '../ui/MisExportButtons';

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

/** True when the date is the last day of its own month, the only day a close makes sense on. */
function isMonthEnd(isoDate: string): boolean {
  if (!isoDate) return false;
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next.getMonth() !== d.getMonth();
}

export function BankSummaryPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;

  const initial = misRangeForPreset('month');
  const [preset, setPreset] = useState<MisPeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);

  const [applied, setApplied] = useState<MisBankSummaryReportParams>({
    from: initial.from,
    to: initial.to,
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(MIS_DEFAULT_PAGE_SIZE);
  const [qInput, setQInput] = useState('');

  const [data, setData] = useState<MisBankSummaryReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);
  const [closing, setClosing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await misApi.bankSummary({ ...applied, page, size: pageSize });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Bank Summary');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied, page, pageSize, reloadToken, notifyError]);

  function applyPreset(next: MisPeriodPreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = misRangeForPreset(next);
    setFromInput(range.from);
    setToInput(range.to);
    setPage(0);
    setApplied({ from: range.from, to: range.to, q: qInput.trim() || undefined });
  }

  function handleSearch() {
    setPage(0);
    setApplied({ from: fromInput, to: toInput, q: qInput.trim() || undefined });
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await misApi.bankSummaryExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await misApi.bankSummaryPdf(applied);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  async function handleClosePeriod() {
    const periodEnd = applied.to;
    if (!periodEnd) return;
    const alreadyClosed = data?.periodClosed === true;
    if (alreadyClosed) {
      const ok = window.confirm(
        `Period ending ${periodEnd} is already closed. Re-closing overwrites the stored ` +
          `closing value, which is what the next period opens from. Continue?`,
      );
      if (!ok) return;
    }
    setClosing(true);
    try {
      await misApi.closeStockPeriod(periodEnd, alreadyClosed);
      notifySuccess(`Closed period ending ${periodEnd}`);
      setReloadToken((n) => n + 1);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to close the period');
    } finally {
      setClosing(false);
    }
  }

  const totals = data?.totals;
  const rows = data?.rows ?? [];
  const totalItems = data?.totalItems ?? 0;
  const totalPages = misTotalPages(totalItems, pageSize);
  const showAdjustment = data?.hasAdjustments === true;
  const columnCount = showAdjustment ? 6 : 5;
  const canClose = useMemo(() => Boolean(applied.to && isMonthEnd(applied.to)), [applied.to]);

  return (
    <Stack gap="md">
      <PageHeader
        title="Bank Summary"
        description="Company-wise opening, purchase, sale and closing stock value, at cost."
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
                  Company
                </Text>
                <Input
                  id="bank-summary-q"
                  type="search"
                  placeholder="Company name…"
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
                disabled={loading}
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

            {canClose ? (
              <Inline gap="sm" flexWrap>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleClosePeriod()}
                  loading={closing}
                  disabled={loading || closing}
                >
                  {data?.periodClosed ? 'Re-close period' : 'Close period'}
                </Button>
                <Text variant="caption" color="secondary">
                  Freezes the closing value above, so the next period opens from it.
                </Text>
              </Inline>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={columnCount} label="Loading bank summary…" />
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <Text color="secondary">No bank summary data.</Text>
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
                Opening
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(totals?.opening)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Purchase
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(totals?.purchase)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Sale
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(totals?.sale)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Closing
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(totals?.closing)}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Inline gap="sm" flexWrap>
                  <Text as="h2" className={accountingChrome.overviewSectionTitle}>
                    Companies
                  </Text>
                  {data.openingSource === 'SNAPSHOT' ? (
                    <Badge variant="success">
                      Opening carried forward from {formatDateShort(data.openingSnapshotDate)}
                    </Badge>
                  ) : (
                    <Badge variant="warning">Opening derived from current stock</Badge>
                  )}
                  {data.periodClosed ? <Badge variant="success">Period closed</Badge> : null}
                </Inline>

                {rows.length === 0 ? (
                  <Text as="p" className={accountingChrome.reportEmpty}>
                    No company held or moved stock in this period.
                  </Text>
                ) : (
                  <Table className={accountingChrome.misTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Company</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Opening
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Purchase
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Sale
                        </TableHeaderCell>
                        {showAdjustment ? (
                          <TableHeaderCell className={accountingChrome.misNumCol}>
                            Adjustment
                          </TableHeaderCell>
                        ) : null}
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Closing
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.company}>
                          <TableCell className={accountingChrome.misPartyCol}>
                            {row.company}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.opening)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.purchase)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.sale)}
                          </TableCell>
                          {showAdjustment ? (
                            <TableCell className={accountingChrome.misNumCol}>
                              {rupee(row.adjustment)}
                            </TableCell>
                          ) : null}
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.closing)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className={accountingChrome.tbTotalsLabel}>TOTAL</TableCell>
                        <TableCell
                          className={cn(accountingChrome.misNumCol, accountingChrome.tbTotalsRow)}
                        >
                          {rupee(totals?.opening)}
                        </TableCell>
                        <TableCell
                          className={cn(accountingChrome.misNumCol, accountingChrome.tbTotalsRow)}
                        >
                          {rupee(totals?.purchase)}
                        </TableCell>
                        <TableCell
                          className={cn(accountingChrome.misNumCol, accountingChrome.tbTotalsRow)}
                        >
                          {rupee(totals?.sale)}
                        </TableCell>
                        {showAdjustment ? (
                          <TableCell
                            className={cn(accountingChrome.misNumCol, accountingChrome.tbTotalsRow)}
                          >
                            {rupee(totals?.adjustment)}
                          </TableCell>
                        ) : null}
                        <TableCell
                          className={cn(accountingChrome.misNumCol, accountingChrome.tbTotalsRow)}
                        >
                          {rupee(totals?.closing)}
                        </TableCell>
                      </TableRow>
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
                  aria-label="Bank summary pages"
                />
              </Stack>
            </CardBody>
          </Card>

          <Text variant="caption" color="secondary">
            {totalItems} compan{totalItems === 1 ? 'y' : 'ies'} · opening + purchase − sale
            {showAdjustment ? ' + adjustment' : ''} = closing, valued at cost.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
