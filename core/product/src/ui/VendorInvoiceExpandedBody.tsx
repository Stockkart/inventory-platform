import { useMemo } from 'react';
import type { InventoryItem, VendorPurchaseInvoiceDetail } from '@inventory-platform/product/types';
import {
  Alert,
  Badge,
  Box,
  CenteredLoader,
  Grid,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './vendor-invoice-expanded.module.css';

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatGst(item: InventoryItem | undefined): string {
  if (!item) return '—';
  const sgst = item.sgst?.trim();
  const cgst = item.cgst?.trim();
  if (!sgst && !cgst) return '—';
  return `SGST ${sgst || '0'} + CGST ${cgst || '0'}`;
}

function vendorDisplay(row: { vendorName?: string | null }): string {
  const n = row.vendorName?.trim();
  if (n) return n;
  return 'Unknown vendor';
}

export interface VendorInvoiceExpandedBodyProps {
  detail: VendorPurchaseInvoiceDetail;
  inventoryById: Record<string, InventoryItem>;
  inventoryLoading: boolean;
  inventoryWarning?: string;
}

export function VendorInvoiceExpandedBody({
  detail,
  inventoryById,
  inventoryLoading,
  inventoryWarning,
}: VendorInvoiceExpandedBodyProps) {
  const totals = useMemo(
    () => [
      { label: 'Line subtotal', value: formatMoney(detail.lineSubTotal) },
      { label: 'Tax total', value: formatMoney(detail.taxTotal) },
      { label: 'Shipping', value: formatMoney(detail.shippingCharge) },
      { label: 'Other charges', value: formatMoney(detail.otherCharges) },
      { label: 'Overall discount', value: formatMoney(detail.overallDiscount) },
      { label: 'Round off', value: formatMoney(detail.roundOff) },
      { label: 'Invoice total', value: formatMoney(detail.invoiceTotal) },
      { label: 'Recorded', value: formatDate(detail.createdAt) },
    ],
    [detail]
  );

  return (
    <Stack gap="md" className={styles.expandedInner}>
      <Inline
        className={styles.expandedHeader}
        justify="between"
        align="start"
        gap="md"
      >
        <Stack gap="xs">
          <Inline gap="sm" align="center">
            <Text variant="heading3" weight="bold">
              {detail.invoiceNo}
            </Text>
            {detail.synthetic ? (
              <Badge variant="neutral">Auto invoice no.</Badge>
            ) : null}
          </Inline>
          <Text weight="semibold">{vendorDisplay(detail)}</Text>
          {detail.invoiceDate ? (
            <Text variant="caption" color="secondary">
              Dated {formatDate(detail.invoiceDate)}
            </Text>
          ) : null}
        </Stack>
        {detail.legacyLotId ? (
          <Text variant="caption" color="secondary" className={styles.legacyHint}>
            Legacy reference:{' '}
            <Text as="span" className={styles.mono}>
              {detail.legacyLotId}
            </Text>
          </Text>
        ) : null}
      </Inline>

      <Grid columns={3} gap="sm" className={styles.amountGrid}>
        {totals.map(({ label, value }) => (
          <Stack key={label} gap="xs" className={styles.amountItem}>
            <Text variant="caption" color="secondary" weight="semibold">
              {label}
            </Text>
            <Text weight="semibold">{value}</Text>
          </Stack>
        ))}
      </Grid>

      <Stack gap="sm" className={styles.linesSection}>
        <Text
          variant="caption"
          color="secondary"
          weight="bold"
          className={styles.linesHeading}
        >
          Products on this invoice
        </Text>
        {inventoryLoading ? (
          <CenteredLoader label="Loading inventory details…" size="sm" />
        ) : null}
        {inventoryWarning ? (
          <Alert variant="warning">{inventoryWarning}</Alert>
        ) : null}
        <Box className={styles.linesTableWrap}>
          <Table className={styles.linesTable}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Company</TableHeaderCell>
                <TableHeaderCell>Barcode</TableHeaderCell>
                <TableHeaderCell>Batch</TableHeaderCell>
                <TableHeaderCell>Expiry</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Cost</TableHeaderCell>
                <TableHeaderCell>MRP</TableHeaderCell>
                <TableHeaderCell>PTR</TableHeaderCell>
                <TableHeaderCell>GST</TableHeaderCell>
                <TableHeaderCell>Current stock</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(detail.lines ?? []).map((line) => {
                const inv =
                  line.inventoryId != null
                    ? inventoryById[line.inventoryId] ?? undefined
                    : undefined;
                return (
                  <TableRow key={`${line.lineIndex}-${line.inventoryId ?? ''}`}>
                    <TableCell className={styles.linesNum}>
                      {line.lineIndex + 1}
                    </TableCell>
                    <TableCell>{line.name}</TableCell>
                    <TableCell className={styles.linesMuted}>
                      {inv?.companyName ?? '—'}
                    </TableCell>
                    <TableCell className={styles.linesMuted}>
                      {line.barcode ?? inv?.barcode ?? '—'}
                    </TableCell>
                    <TableCell className={styles.linesMuted}>
                      {inv?.batchNo ?? '—'}
                    </TableCell>
                    <TableCell className={styles.linesMuted}>
                      {formatCompactDate(inv?.expiryDate)}
                    </TableCell>
                    <TableCell>{line.count ?? '—'}</TableCell>
                    <TableCell className={styles.linesMoney}>
                      {formatMoney(line.costPrice ?? inv?.costPrice)}
                    </TableCell>
                    <TableCell className={styles.linesMoney}>
                      {formatMoney(inv?.maximumRetailPrice)}
                    </TableCell>
                    <TableCell className={styles.linesMoney}>
                      {formatMoney(inv?.priceToRetail)}
                    </TableCell>
                    <TableCell className={styles.linesMuted}>
                      {formatGst(inv)}
                    </TableCell>
                    <TableCell className={styles.linesMoney}>
                      {inv?.currentCount ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Stack>
  );
}
