import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../api/inventory.api';
import type { VendorPurchaseReturnSummary } from '@inventory-platform/product/types';
import { useNotify } from '@inventory-platform/session';
import {
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
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
  cn,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { HistoryListSummary } from './HistoryListSummary';
import { PrintCreditNoteModal } from './PrintCreditNoteModal';
import type { HistoryFilters } from './historyFilters';
import {
  hasActiveHistoryFilters,
  isDateInRange,
  paginateLocal,
  matchesRegexField,
} from './historyFilters';

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

function creditNoteLabel(r: VendorPurchaseReturnSummary): string {
  const note = r.supplierCreditNoteNo?.trim();
  return note || 'No debit note number';
}

function HistoryField({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <Box className={productChrome.salePickField}>
      <Text as="p" className={productChrome.salePickLabel}>
        {label}
      </Text>
      <Text
        as="p"
        className={cn(
          productChrome.salePickValue,
          strong && productChrome.salePickValueStrong,
          muted && productChrome.salePickValueMuted,
        )}
      >
        {value}
      </Text>
    </Box>
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
  const [printTarget, setPrintTarget] = useState<{
    returnId: string;
    creditNoteNo?: string;
  } | null>(null);
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
            {returns.map((r) => {
              const note = creditNoteLabel(r);
              const hasNote = Boolean(r.supplierCreditNoteNo?.trim());
              const invoice = r.invoiceNo?.trim() || '—';
              const vendor = r.vendorName?.trim() || '—';
              const hasLines = (r.lines?.length ?? 0) > 0;

              return (
                <Card key={r.returnId} className={productChrome.historyRecordCard}>
                  <CardBody>
                    <Box className={productChrome.salePickMain}>
                      <Box className={productChrome.historyRecordHeader}>
                        <Box className={productChrome.salePickTitleRow}>
                          <Text as="p" className={productChrome.salePickInvoiceHint}>
                            Debit note
                          </Text>
                          <Text
                            as="p"
                            className={cn(
                              productChrome.salePickTitle,
                              !hasNote && productChrome.salePickValueMuted,
                            )}
                          >
                            {note}
                          </Text>
                        </Box>
                        <Box className={productChrome.historyRecordActions}>
                          <Text as="p" className={productChrome.historyRecordAmount}>
                            {formatCurrency(r.returnAmount)}
                          </Text>
                          <Inline gap="xs" align="center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setPrintTarget({
                                  returnId: r.returnId,
                                  creditNoteNo: r.supplierCreditNoteNo,
                                })
                              }
                            >
                              Print
                            </Button>
                          </Inline>
                        </Box>
                      </Box>

                      <Box className={productChrome.salePickGrid}>
                        <HistoryField label="Date" value={formatDate(r.createdAt)} />
                        <HistoryField
                          label="Purchase invoice"
                          value={invoice}
                          muted={invoice === '—'}
                        />
                        <HistoryField label="Vendor" value={vendor} muted={vendor === '—'} />
                        <HistoryField
                          label="Lines returned"
                          value={String(r.totalLinesReturned ?? 0)}
                        />
                        {r.reason?.trim() ? (
                          <HistoryField label="Reason" value={r.reason.trim()} />
                        ) : null}
                      </Box>
                    </Box>
                  </CardBody>

                  {hasLines ? (
                    <Box className={productChrome.historyItemsPanel}>
                      <Text as="p" className={productChrome.historyItemsTitle}>
                        Line breakdown
                      </Text>
                      <Box overflow="auto">
                        <Table
                          className={cn(surfaceChrome.minW320, productChrome.historyItemsTable)}
                        >
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell>Product</TableHeaderCell>
                              <TableHeaderCell>Barcode</TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.numericCell}>
                                Qty returned
                              </TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.numericCell}>
                                Taxable
                              </TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.numericCell}>
                                CGST
                              </TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.numericCell}>
                                SGST/UTGST
                              </TableHeaderCell>
                              <TableHeaderCell className={surfaceChrome.numericCell}>
                                Line total
                              </TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(r.lines ?? []).map((line, idx) => (
                              <TableRow key={`${line.inventoryId ?? 'unknown'}-${idx}`}>
                                <TableCell>
                                  <Text weight="medium">
                                    {line.productName?.trim()
                                      ? line.productName
                                      : line.inventoryId ?? '—'}
                                  </Text>
                                </TableCell>
                                <TableCell>{line.barcode ?? '—'}</TableCell>
                                <TableCell className={surfaceChrome.numericCell}>
                                  {formatReturnedDisplayQty(line.displayQuantityReturned)}
                                </TableCell>
                                <TableCell className={surfaceChrome.numericCell}>
                                  {moneyOrDash(line.taxableValue)}
                                </TableCell>
                                <TableCell className={surfaceChrome.numericCell}>
                                  {moneyOrDash(line.centralGstAmount)}
                                </TableCell>
                                <TableCell className={surfaceChrome.numericCell}>
                                  {moneyOrDash(line.stateGstAmount)}
                                </TableCell>
                                <TableCell className={surfaceChrome.numericCell}>
                                  <Text weight="semibold">{moneyOrDash(line.lineNoteValue)}</Text>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>
                  ) : (
                    <Box className={productChrome.historyItemsPanel}>
                      <Text variant="caption" color="secondary">
                        No saved line breakdown for this debit note (often older returns).
                      </Text>
                    </Box>
                  )}
                </Card>
              );
            })}
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

      <PrintCreditNoteModal
        isOpen={printTarget != null}
        onClose={() => setPrintTarget(null)}
        source="vendor"
        documentId={printTarget?.returnId ?? ''}
        creditNoteNo={printTarget?.creditNoteNo}
        onError={(message) => notifyError(message)}
      />
    </Stack>
  );
}
