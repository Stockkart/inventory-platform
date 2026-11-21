import { useState, type ReactNode } from 'react';
import type {
  StockEntryEstimateLine,
  StockEntryEstimateSummary,
} from '@inventory-platform/product/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
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
import { formatPercent } from '../lib/billedLineLabels';
import { useStockEntryEstimateDetailQuery } from '../queries/hooks';
import { SummaryRow, formatCurrency } from './SaleLineItems';

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
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

function money(value: number | null | undefined): string {
  return value != null && value !== 0 ? formatCurrency(value) : '—';
}

function lineGstLabel(line: StockEntryEstimateLine): string {
  const cgst = Number.parseFloat(line.cgst ?? '');
  const sgst = Number.parseFloat(line.sgst ?? '');
  const total = (Number.isNaN(cgst) ? 0 : cgst) + (Number.isNaN(sgst) ? 0 : sgst);
  return total > 0 ? formatPercent(total) : '—';
}

function HistoryField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Box className={productChrome.salePickField}>
      <Text as="p" className={productChrome.salePickLabel}>
        {label}
      </Text>
      <Text
        as="p"
        className={cn(productChrome.salePickValue, muted && productChrome.salePickValueMuted)}
      >
        {value}
      </Text>
    </Box>
  );
}

function EstimateLinesTable({ lines }: { lines: StockEntryEstimateLine[] }) {
  return (
    <Box overflow="auto">
      <Table className={cn(surfaceChrome.minW320, productChrome.historyItemsTable)}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Batch</TableHeaderCell>
            <TableHeaderCell>HSN</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Qty</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Cost</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>MRP</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>GST</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={`${line.barcode ?? line.name ?? 'line'}-${idx}`}>
              <TableCell>
                <Text as="p">{line.name?.trim() || '—'}</Text>
                {line.companyName?.trim() ? (
                  <Text as="p" variant="caption" color="secondary">
                    {line.companyName}
                  </Text>
                ) : null}
              </TableCell>
              <TableCell>{line.batchNo?.trim() || '—'}</TableCell>
              <TableCell>{line.hsn?.trim() || '—'}</TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {line.count ?? 0}
                {line.baseUnit?.trim() ? ` ${line.baseUnit}` : ''}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>{money(line.costPrice)}</TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {money(line.maximumRetailPrice)}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>{lineGstLabel(line)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function StockEntryEstimateListCard({
  estimate,
  busy,
  actions,
}: {
  estimate: StockEntryEstimateSummary;
  busy: boolean;
  /** Buttons for the footer; the page decides which actions each state allows. */
  actions: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailQuery = useStockEntryEstimateDetailQuery(estimate.id, { enabled: expanded });
  const detail = detailQuery.data;
  const lines = detail?.lines ?? [];

  const statusVariant =
    estimate.state === 'OPEN' ? 'success' : estimate.state === 'LOCKED' ? 'info' : 'neutral';
  const statusLabel =
    estimate.state === 'OPEN'
      ? 'Open'
      : estimate.state === 'LOCKED'
      ? 'Locked'
      : estimate.state === 'CONVERTED'
      ? 'Converted'
      : 'Discarded';
  const estimateNo = estimate.estimateNo?.trim() || null;

  const footer = actions ? (
    <Box
      className={cn(
        productChrome.historyRecordFooter,
        expanded && productChrome.historyRecordFooterAfterItems,
      )}
    >
      {actions}
    </Box>
  ) : null;

  return (
    <Card className={productChrome.historyRecordCard}>
      <CardBody>
        <Box className={productChrome.salePickMain}>
          <Box className={productChrome.historyRecordHeader}>
            <Box className={productChrome.salePickTitleRow}>
              <Text as="p" className={productChrome.salePickInvoiceHint}>
                Entry estimate
              </Text>
              <Text
                as="p"
                className={cn(
                  productChrome.salePickTitle,
                  !estimateNo && productChrome.salePickValueMuted,
                )}
              >
                {estimateNo ?? 'No estimate number'}
              </Text>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              {estimate.awaitingConversion ? (
                <Badge variant="warning">Awaiting conversion</Badge>
              ) : null}
            </Box>
            <Box className={productChrome.historyRecordActions}>
              {estimate.invoiceTotal ? (
                <Text as="p" className={productChrome.historyRecordAmount}>
                  {formatCurrency(estimate.invoiceTotal)}
                </Text>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? 'Hide items' : 'View items'}
              </Button>
            </Box>
          </Box>

          <Box className={productChrome.salePickGrid}>
            <HistoryField
              label="Date"
              value={formatDate(estimate.updatedAt ?? estimate.createdAt)}
            />
            <HistoryField label="Items" value={String(estimate.itemCount)} />
            {estimate.vendorInvoiceNo ? (
              <HistoryField label="Vendor invoice" value={estimate.vendorInvoiceNo} />
            ) : null}
            {estimate.state === 'CONVERTED' ? (
              <HistoryField label="Status" value="Converted — stock registered in Product Entry" />
            ) : null}
          </Box>

          {!expanded ? footer : null}
        </Box>
      </CardBody>

      {expanded ? (
        <Box className={productChrome.historyItemsPanel}>
          <Text as="p" className={productChrome.historyItemsTitle}>
            Line items
          </Text>
          {detailQuery.isLoading ? (
            <CenteredLoader label="Loading items…" />
          ) : detailQuery.isError ? (
            <Alert variant="danger">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Failed to load estimate items'}
            </Alert>
          ) : lines.length === 0 ? (
            <Text variant="caption" color="secondary">
              No line items on this estimate.
            </Text>
          ) : (
            <>
              <EstimateLinesTable lines={lines} />
              {detail?.lineSubTotal || detail?.taxTotal || detail?.invoiceTotal ? (
                <Box className={productChrome.historyTotalsPanel}>
                  {detail.lineSubTotal ? (
                    <SummaryRow label="Subtotal" value={formatCurrency(detail.lineSubTotal)} />
                  ) : null}
                  {detail.taxTotal ? (
                    <SummaryRow label="Tax" value={formatCurrency(detail.taxTotal)} />
                  ) : null}
                  {detail.invoiceTotal ? (
                    <SummaryRow label="Total" value={formatCurrency(detail.invoiceTotal)} total />
                  ) : null}
                </Box>
              ) : null}
            </>
          )}
        </Box>
      ) : null}

      {expanded ? footer : null}
    </Card>
  );
}
