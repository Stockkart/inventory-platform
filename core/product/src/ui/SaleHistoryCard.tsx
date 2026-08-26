import { useState } from 'react';
import type { CheckoutItemResponse, Purchase } from '@inventory-platform/product/types';
import { formatCustomerDisplayName } from '../lib/customerDisplay';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
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
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
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

function formatStatus(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED') return 'Cancelled';
  if (!s) return '—';
  return status.charAt(0) + status.slice(1).toLowerCase();
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

/** Percent as it was entered, without the trailing zeros a fixed format would add. */
function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * The scheme the line was billed on: a percentage, or a pay-for/free pair, or nothing. Reads the
 * sale-side fields; the purchase-side ones are what the stock was bought on, not sold on.
 */
function schemeLabel(item: CheckoutItemResponse): string {
  if (item.schemeType === 'PERCENTAGE' && item.schemePercentage) {
    return formatPercent(item.schemePercentage);
  }
  if (item.schemePayFor != null && item.schemeFree != null) {
    return `${item.schemePayFor}+${item.schemeFree}`;
  }
  return '—';
}

/** CGST and SGST are carried as strings on the line; the bill shows their sum. */
function gstLabel(item: CheckoutItemResponse): string {
  const cgst = Number.parseFloat(item.cgst ?? '');
  const sgst = Number.parseFloat(item.sgst ?? '');
  const total = (Number.isNaN(cgst) ? 0 : cgst) + (Number.isNaN(sgst) ? 0 : sgst);
  return total > 0 ? formatPercent(total) : '—';
}

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  if (total) {
    return (
      <Inline justify="between" align="end" width="full" className={productChrome.summaryRowTotal}>
        <Text as="span" className={productChrome.summaryRowTotalLabel}>
          {label}
        </Text>
        <Text as="span" className={productChrome.summaryRowTotalValue}>
          {value}
        </Text>
      </Inline>
    );
  }
  return (
    <Inline justify="between" width="full" className={productChrome.summaryRow}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text weight="medium">{value}</Text>
    </Inline>
  );
}

export function SaleHistoryCard({ purchase }: { purchase: Purchase }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const paymentSplitLine = formatPaymentSplit({
    cashAmount: purchase.cashAmount ?? undefined,
    onlineAmount: purchase.onlineAmount ?? undefined,
    creditAmount: purchase.creditAmount ?? undefined,
  });

  const invoiceNo = purchase.invoiceNo?.trim() || null;
  const paymentLabel = formatPaymentMethod(purchase.paymentMethod);
  const hasPayment = Boolean(purchase.paymentMethod) && paymentLabel !== 'Not specified';
  const customer = formatCustomerDisplayName(purchase.customerName);
  const phone = purchase.customerPhone?.trim() || '—';
  const hasItems = purchase.items.length > 0;

  const statusVariant =
    purchase.status === 'COMPLETED'
      ? 'success'
      : purchase.status === 'CANCELLED'
      ? 'danger'
      : 'neutral';

  return (
    <>
      <Card className={productChrome.historyRecordCard}>
        <CardBody>
          <Box className={productChrome.salePickMain}>
            <Box className={productChrome.historyRecordHeader}>
              <Box className={productChrome.salePickTitleRow}>
                <Text as="p" className={productChrome.salePickInvoiceHint}>
                  Invoice
                </Text>
                <Text
                  as="p"
                  className={cn(
                    productChrome.salePickTitle,
                    !invoiceNo && productChrome.salePickValueMuted,
                  )}
                >
                  {invoiceNo ?? 'No invoice number'}
                </Text>
                <Badge variant={statusVariant}>{formatStatus(purchase.status)}</Badge>
              </Box>
              <Box className={productChrome.historyRecordActions}>
                <Text as="p" className={productChrome.historyRecordAmount}>
                  {formatCurrency(purchase.grandTotal)}
                </Text>
                <Inline gap="xs" align="center">
                  {purchase.status === 'COMPLETED' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPrintModal(true)}
                    >
                      Print
                    </Button>
                  ) : null}
                  {hasItems ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                    >
                      {expanded ? 'Hide items' : 'View items'}
                    </Button>
                  ) : null}
                </Inline>
              </Box>
            </Box>

            <Box className={productChrome.salePickGrid}>
              <HistoryField label="Date" value={formatDate(purchase.soldAt)} />
              <HistoryField label="Customer" value={customer} />
              <HistoryField label="Phone" value={phone} muted={phone === '—'} />
              <HistoryField
                label="Payment"
                value={hasPayment ? paymentLabel : '—'}
                muted={!hasPayment}
              />
              {paymentSplitLine ? <HistoryField label="Split" value={paymentSplitLine} /> : null}
              <HistoryField label="Items" value={String(purchase.items.length)} />
            </Box>
          </Box>
        </CardBody>

        {expanded && hasItems ? (
          <Box className={productChrome.historyItemsPanel}>
            <Text as="p" className={productChrome.historyItemsTitle}>
              Line items
            </Text>
            <Box overflow="auto">
              <Table className={cn(surfaceChrome.minW320, productChrome.historyItemsTable)}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>Qty</TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>MRP</TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>
                      Unit price
                    </TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>
                      Discount
                    </TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>Scheme</TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>GST</TableHeaderCell>
                    <TableHeaderCell className={surfaceChrome.numericCell}>
                      Line total
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchase.items.map((item, idx) => (
                    <TableRow key={`${item.inventoryId ?? item.name}-${idx}`}>
                      <TableCell>
                        <Text weight="medium">{item.name ?? item.inventoryId ?? '—'}</Text>
                      </TableCell>
                      <TableCell className={surfaceChrome.numericCell}>{item.quantity}</TableCell>
                      <TableCell className={surfaceChrome.numericCell}>
                        {item.maximumRetailPrice ? formatCurrency(item.maximumRetailPrice) : '—'}
                      </TableCell>
                      <TableCell className={surfaceChrome.numericCell}>
                        {formatCurrency(item.priceToRetail ?? 0)}
                      </TableCell>
                      <TableCell className={surfaceChrome.numericCell}>
                        {/* The discount rate the operator applied at sale, not the rupee value
                            of it. item.discount holds (MRP - selling price) x quantity, which
                            rendered beside this caption with no separator and read as one
                            garbled figure. */}
                        {item.saleAdditionalDiscount
                          ? formatPercent(item.saleAdditionalDiscount)
                          : '—'}
                      </TableCell>
                      <TableCell className={surfaceChrome.numericCell}>
                        {schemeLabel(item)}
                      </TableCell>
                      <TableCell className={surfaceChrome.numericCell}>{gstLabel(item)}</TableCell>
                      <TableCell className={surfaceChrome.numericCell}>
                        <Text weight="semibold">
                          {/* What the line was billed, taxes and discounts included. Multiplying
                              rate by quantity here disagreed with the invoice on every line that
                              carried a discount or a scheme. */}
                          {formatCurrency(
                            item.totalAmount ?? (item.priceToRetail ?? 0) * (item.quantity ?? 0),
                          )}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box className={productChrome.historyTotalsPanel}>
              <SummaryRow label="Subtotal" value={formatCurrency(purchase.subTotal ?? 0)} />
              {purchase.discountTotal ? (
                <SummaryRow
                  label="Discount"
                  value={`− ${formatCurrency(purchase.discountTotal)}`}
                />
              ) : null}
              {purchase.sgstAmount ? (
                <SummaryRow label="SGST" value={formatCurrency(purchase.sgstAmount)} />
              ) : null}
              {purchase.cgstAmount ? (
                <SummaryRow label="CGST" value={formatCurrency(purchase.cgstAmount)} />
              ) : null}
              {/* Older sales carry the tax total but not the split between SGST and CGST. */}
              {!purchase.sgstAmount && !purchase.cgstAmount && purchase.taxTotal ? (
                <SummaryRow label="Tax" value={formatCurrency(purchase.taxTotal)} />
              ) : null}
              <SummaryRow label="Total" value={formatCurrency(purchase.grandTotal ?? 0)} total />
            </Box>
          </Box>
        ) : null}
      </Card>
      <PrintInvoiceModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseId={purchase.purchaseId}
        invoiceNo={purchase.invoiceNo}
      />
    </>
  );
}
