import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
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
import type { MisStockReportParams, MisStockReportResponse } from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { formatMoney } from '../model/format';
import { MIS_DEFAULT_PAGE_SIZE, MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';
import { MisExportButtons } from '../ui/MisExportButtons';

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

function toAppliedParams(
  q: string,
  lowStockOnly: boolean,
  deadStockOnly: boolean,
): MisStockReportParams {
  return {
    q: q.trim() || undefined,
    lowStockOnly: lowStockOnly || undefined,
    deadStockOnly: deadStockOnly || undefined,
  };
}

export function StockMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;

  const [qInput, setQInput] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [deadStockOnly, setDeadStockOnly] = useState(false);

  const [applied, setApplied] = useState<MisStockReportParams>(() =>
    toAppliedParams('', false, false),
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(MIS_DEFAULT_PAGE_SIZE);

  const [data, setData] = useState<MisStockReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await misApi.stock({ ...applied, page, size: pageSize });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Stock MIS');
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
    () => toAppliedParams(qInput, lowStockOnly, deadStockOnly),
    [qInput, lowStockOnly, deadStockOnly],
  );

  function handleSearch() {
    setPage(0);
    setApplied(draftParams);
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await misApi.stockExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else {
        const result = await misApi.stockPdf(applied);
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
      <PageHeader title="Stock" description="On-hand lots, valuation, low stock, and dead stock." />

      <Card>
        <CardBody>
          <Stack gap="md">
            <Box className={accountingChrome.misFilterRow}>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  Search
                </Text>
                <Input
                  id="stock-mis-q"
                  type="search"
                  placeholder="Product, barcode, lot…"
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

            <Box className={accountingChrome.misFilterRow}>
              <Checkbox
                label="Low stock only"
                checked={lowStockOnly}
                onChange={() => setLowStockOnly((v) => !v)}
                disabled={loading}
              />
              <Checkbox
                label="Dead stock only"
                checked={deadStockOnly}
                onChange={() => setDeadStockOnly((v) => !v)}
                disabled={loading}
              />
            </Box>
          </Stack>
        </CardBody>
      </Card>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={9} label="Loading stock…" />
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <Text color="secondary">No stock data.</Text>
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
                Lots
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {summary?.lotCount ?? 0}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Cost valuation
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.costValuation)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Sell valuation
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {rupee(summary?.sellValuation)}
              </Text>
            </Box>
            <Box
              className={cn(
                accountingChrome.overviewKpiCard,
                accountingChrome.overviewKpiCardCenter,
              )}
            >
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Low / dead
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                {summary?.lowStockCount ?? 0} / {summary?.deadStockCount ?? 0}
              </Text>
            </Box>
          </Box>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text as="h2" className={accountingChrome.overviewSectionTitle}>
                  Stock lots
                </Text>
                {rows.length === 0 ? (
                  <Text as="p" className={accountingChrome.reportEmpty}>
                    No lots match these filters.
                  </Text>
                ) : (
                  <Table className={accountingChrome.misTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell>Barcode</TableHeaderCell>
                        <TableHeaderCell>Lot</TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          On hand
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Cost
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Sell
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Cost value
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misNumCol}>
                          Sell value
                        </TableHeaderCell>
                        <TableHeaderCell className={accountingChrome.misTxnTypeCol}>
                          Flags
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={`${row.inventoryId}-${row.lotId ?? ''}`}>
                          <TableCell className={accountingChrome.misPartyCol}>
                            {row.name || '—'}
                          </TableCell>
                          <TableCell className={accountingChrome.misNarrationCol}>
                            {row.barcode || '—'}
                          </TableCell>
                          <TableCell className={accountingChrome.misInvoiceCol}>
                            {row.lotId || '—'}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {formatMoney(row.onHand)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.costPrice)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.sellPrice)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.costValue)}
                          </TableCell>
                          <TableCell className={accountingChrome.misNumCol}>
                            {rupee(row.sellValue)}
                          </TableCell>
                          <TableCell className={accountingChrome.misTxnTypeCol}>
                            {row.lowStock ? <Badge variant="warning">Low</Badge> : null}
                            {row.lowStock && row.deadStock ? ' ' : null}
                            {row.deadStock ? <Badge variant="danger">Dead</Badge> : null}
                            {!row.lowStock && !row.deadStock ? '—' : null}
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
                  aria-label="Stock pages"
                />
              </Stack>
            </CardBody>
          </Card>

          <Text variant="caption" color="secondary">
            {totalItems} row{totalItems === 1 ? '' : 's'}
            {summary ? ` · on hand ${formatMoney(summary.onHandQty)}` : ''}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
