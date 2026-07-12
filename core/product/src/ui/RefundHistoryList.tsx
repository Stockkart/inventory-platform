import { useState, useEffect, useCallback } from 'react';
import { refundsApi } from '@inventory-platform/product/api';
import type { Refund } from '@inventory-platform/product/types';
import { useNotify } from '@inventory-platform/session';
import {
  Box,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
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

function creditNoteLabel(refund: Refund): string {
  const note = refund.creditNoteNo?.trim();
  return note || 'No credit note number';
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

export interface RefundHistoryListProps {
  refreshTrigger?: number;
  filters?: HistoryFilters;
}

const FILTER_FETCH_LIMIT = 100;
const PAGE_SIZE = 20;

function applyRefundFilters(rows: Refund[], applied: HistoryFilters): Refund[] {
  return rows
    .filter((r) => isDateInRange(r.createdAt, applied.dateFrom, applied.dateTo))
    .filter((r) => matchesRegexField(applied.invoiceNo, r.invoiceNo))
    .filter((r) =>
      matchesRegexField(applied.customer, r.customerName, r.customerPhone, r.customerEmail),
    );
}

export function RefundHistoryList({ refreshTrigger, filters }: RefundHistoryListProps) {
  const applied = filters;
  const filtering = applied != null && hasActiveHistoryFilters(applied, 'customerReturnHistory');

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);

    try {
      if (filtering && applied) {
        const response = await refundsApi.getAll({
          page: 1,
          limit: FILTER_FETCH_LIMIT,
        });
        const rows = applyRefundFilters(response.refunds, applied);
        const paged = paginateLocal(rows, page, limit);
        setRefunds(paged.slice);
        setTotalPages(paged.totalPages);
        setTotal(paged.total);
      } else {
        const response = await refundsApi.getAll({ page, limit });
        setRefunds(response.refunds);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      }
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load return history. Please try again.',
      );
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  }, [applied, filtering, limit, notifyError, page]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && refunds.length === 0) {
    return (
      <Stack width="full">
        <CenteredLoader label="Loading return history…" />
      </Stack>
    );
  }

  if (refunds.length === 0) {
    return (
      <Stack width="full">
        <EmptyState title={filtering ? 'No returns match these filters.' : 'No returns found.'} />
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
      <Stack gap="md">
        {refunds.map((refund) => {
          const note = creditNoteLabel(refund);
          const hasNote = Boolean(refund.creditNoteNo?.trim());
          const invoice = refund.invoiceNo?.trim() || '—';
          const customer = refund.customerName?.trim() || 'Walk-in customer';
          const phone = refund.customerPhone?.trim() || '—';
          const hasLines = Boolean(refund.refundedItems && refund.refundedItems.length > 0);

          return (
            <Card key={refund.refundId} className={productChrome.historyRecordCard}>
              <CardBody>
                <Box className={productChrome.salePickMain}>
                  <Box className={productChrome.historyRecordHeader}>
                    <Box className={productChrome.salePickTitleRow}>
                      <Text as="p" className={productChrome.salePickInvoiceHint}>
                        Credit note
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
                    <Text as="p" className={productChrome.historyRecordAmount}>
                      {formatCurrency(refund.refundAmount)}
                    </Text>
                  </Box>

                  <Box className={productChrome.salePickGrid}>
                    <HistoryField label="Date" value={formatDate(refund.createdAt)} />
                    <HistoryField label="Invoice" value={invoice} muted={invoice === '—'} />
                    <HistoryField label="Customer" value={customer} />
                    <HistoryField label="Phone" value={phone} muted={phone === '—'} />
                    <HistoryField
                      label="Items returned"
                      value={String(refund.totalItemsRefunded ?? 0)}
                    />
                    {refund.reason?.trim() ? (
                      <HistoryField label="Reason" value={refund.reason.trim()} />
                    ) : null}
                  </Box>
                </Box>
              </CardBody>

              {hasLines ? (
                <Box className={productChrome.historyItemsPanel}>
                  <Text as="p" className={productChrome.historyItemsTitle}>
                    Returned items
                  </Text>
                  <Box overflow="auto">
                    <Table className={cn(surfaceChrome.minW320, productChrome.historyItemsTable)}>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Product</TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.numericCell}>
                            Qty
                          </TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.numericCell}>
                            Unit price
                          </TableHeaderCell>
                          <TableHeaderCell className={surfaceChrome.numericCell}>
                            Line refund
                          </TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(refund.refundedItems ?? []).map((row, idx) => (
                          <TableRow key={`${row.inventoryId}-${idx}`}>
                            <TableCell>
                              <Text weight="medium">
                                {row.name?.trim() ? row.name : row.inventoryId ?? '—'}
                              </Text>
                            </TableCell>
                            <TableCell className={surfaceChrome.numericCell}>
                              {row.quantity}
                            </TableCell>
                            <TableCell className={surfaceChrome.numericCell}>
                              {moneyOrDash(row.priceToRetail)}
                            </TableCell>
                            <TableCell className={surfaceChrome.numericCell}>
                              <Text weight="semibold">{moneyOrDash(row.itemRefundAmount)}</Text>
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
                    No line-by-line breakdown saved for this return (often older records).
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
        aria-label="Customer return pages"
      />
    </Stack>
  );
}
