import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../api/inventory.api';
import type { VendorPurchaseReturnSummary } from '@inventory-platform/product/types';
import { useNotify } from '@inventory-platform/session';
import {
  Box,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Grid,
  Inline,
  PaginationBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { HistoryListSummary } from './HistoryListSummary';
import type { HistoryFilters } from './historyFilters';
import {
  hasActiveHistoryFilters,
  isDateInRange,
  paginateLocal,
  matchesRegexField,
} from './historyFilters';

const recordHeaderStyle = {
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border-color)',
} as const;

const breakdownWrapStyle = {
  paddingTop: '1rem',
  borderTop: '1px solid var(--border-color)',
} as const;

const breakdownLegacyStyle = {
  paddingTop: '1rem',
  borderTop: '1px dashed var(--border-color)',
} as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function moneyOrDash(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) {
    return '—';
  }
  return formatCurrency(n);
}

function formatReturnedDisplayQty(displayQuantityReturned: unknown): string {
  const d = typeof displayQuantityReturned === 'number' ? displayQuantityReturned : null;
  if (d == null || Number.isNaN(d) || !Number.isFinite(d)) {
    return '—';
  }
  const rounded = Math.round(d * 10000) / 10000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-8) {
    return String(Math.round(rounded));
  }
  return String(rounded);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Inline gap="xs">
      <Text variant="caption" color="secondary" weight="semibold">
        {label}:
      </Text>
      <Text variant="caption" color="secondary">
        {value}
      </Text>
    </Inline>
  );
}

export interface VendorReturnHistoryListProps {
  refreshTrigger?: number;
  filters?: HistoryFilters;
}

const FILTER_FETCH_LIMIT = 100;
const PAGE_SIZE = 20;

function applyVendorReturnFilters(
  rows: VendorPurchaseReturnSummary[],
  applied: HistoryFilters,
): VendorPurchaseReturnSummary[] {
  return rows
    .filter((r) => isDateInRange(r.createdAt, applied.dateFrom, applied.dateTo))
    .filter((r) => matchesRegexField(applied.invoiceNo, r.invoiceNo))
    .filter((r) => matchesRegexField(applied.vendor, r.vendorName));
}

export function VendorReturnHistoryList({ refreshTrigger, filters }: VendorReturnHistoryListProps) {
  const applied = filters;
  const filtering = applied != null && hasActiveHistoryFilters(applied, 'vendorReturnHistory');

  const [returns, setReturns] = useState<VendorPurchaseReturnSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      if (filtering && applied) {
        const res = await inventoryApi.listVendorPurchaseReturns({
          page: 1,
          limit: FILTER_FETCH_LIMIT,
        });
        const rows = applyVendorReturnFilters(res.returns ?? [], applied);
        const paged = paginateLocal(rows, page, limit);
        setReturns(paged.slice);
        setTotalPages(paged.totalPages);
        setTotal(paged.total);
      } else {
        const res = await inventoryApi.listVendorPurchaseReturns({ page, limit });
        setReturns(res.returns ?? []);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load supplier return history.');
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, [applied, filtering, limit, notifyError, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && returns.length === 0) {
    return (
      <Stack width="full">
        <CenteredLoader label="Loading supplier return history…" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full">
      <HistoryListSummary
        page={page}
        limit={limit}
        total={total}
        filtered={filtering}
        label="returns"
      />

      {returns.length === 0 ? (
        <EmptyState
          title={
            filtering ? 'No supplier returns match these filters.' : 'No supplier returns yet.'
          }
        />
      ) : (
        <>
          <Stack gap="md">
            {returns.map((r) => (
              <Card key={r.returnId}>
                <CardBody>
                  <Stack gap="md">
                    <Inline justify="between" align="start" gap="md" style={recordHeaderStyle}>
                      <DetailLine
                        label="Credit note"
                        value={r.supplierCreditNoteNo ?? r.returnId}
                      />
                      <DetailLine label="Date" value={formatDate(r.createdAt)} />
                    </Inline>
                    <Grid columns={2} gap="sm">
                      <DetailLine label="Purchase invoice" value={r.invoiceNo ?? '—'} />
                      <DetailLine label="Vendor" value={r.vendorName ?? '—'} />
                      <DetailLine label="Lines returned" value={String(r.totalLinesReturned)} />
                      <DetailLine label="Note value" value={formatCurrency(r.returnAmount)} />
                      {r.reason ? <DetailLine label="Reason" value={r.reason} /> : null}
                    </Grid>
                    {(r.lines?.length ?? 0) > 0 ? (
                      <Stack gap="sm" style={breakdownWrapStyle}>
                        <Text
                          variant="caption"
                          color="secondary"
                          weight="semibold"
                          style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                        >
                          Line breakdown
                        </Text>
                        <Box overflow="auto">
                          <Table style={{ minWidth: '320px' }}>
                            <TableHead>
                              <TableRow>
                                <TableHeaderCell>Product</TableHeaderCell>
                                <TableHeaderCell>Barcode</TableHeaderCell>
                                <TableHeaderCell>Qty returned</TableHeaderCell>
                                <TableHeaderCell>Taxable</TableHeaderCell>
                                <TableHeaderCell>CGST</TableHeaderCell>
                                <TableHeaderCell>SGST/UTGST</TableHeaderCell>
                                <TableHeaderCell>Line total</TableHeaderCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {r.lines!.map((line, idx) => (
                                <TableRow key={`${line.inventoryId ?? 'unknown'}-${idx}`}>
                                  <TableCell>
                                    {line.productName?.trim()
                                      ? line.productName
                                      : line.inventoryId ?? '—'}
                                  </TableCell>
                                  <TableCell>{line.barcode ?? '—'}</TableCell>
                                  <TableCell>
                                    {formatReturnedDisplayQty(line.displayQuantityReturned)}
                                  </TableCell>
                                  <TableCell>{moneyOrDash(line.taxableValue)}</TableCell>
                                  <TableCell>{moneyOrDash(line.centralGstAmount)}</TableCell>
                                  <TableCell>{moneyOrDash(line.stateGstAmount)}</TableCell>
                                  <TableCell>{moneyOrDash(line.lineNoteValue)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Stack>
                    ) : (
                      <Text variant="caption" color="secondary" style={breakdownLegacyStyle}>
                        No saved line breakdown for this debit note (often older returns).
                      </Text>
                    )}
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Stack>

          <PaginationBar
            page={page - 1}
            totalPages={totalPages}
            totalItems={total}
            disabled={isLoading}
            onPageChange={(p) => handlePageChange(p + 1)}
            aria-label="Supplier return pages"
          />
        </>
      )}
    </Stack>
  );
}
