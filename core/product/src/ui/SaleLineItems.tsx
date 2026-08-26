import type { CheckoutItemResponse } from '@inventory-platform/product/types';
import {
  Box,
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

/**
 * The line-item table and totals a billed document shows, shared by completed sales
 * and by estimates.
 *
 * An estimate is the same cart as a sale, read before it was converted, so it carries
 * the same MRP, discount, scheme and GST on every line. It used to render four columns
 * against the sale's eight, which made the same document look like it held less
 * information depending on where you opened it.
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Percent as it was entered, without the trailing zeros a fixed format would add. */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * The scheme the line was billed on: a percentage, or a pay-for/free pair, or nothing. Reads the
 * sale-side fields; the purchase-side ones are what the stock was bought on, not sold on.
 */
export function schemeLabel(item: CheckoutItemResponse): string {
  if (item.schemeType === 'PERCENTAGE' && item.schemePercentage) {
    return formatPercent(item.schemePercentage);
  }
  if (item.schemePayFor != null && item.schemeFree != null) {
    return `${item.schemePayFor}+${item.schemeFree}`;
  }
  return '—';
}

/** CGST and SGST are carried as strings on the line; the bill shows their sum. */
export function gstLabel(item: CheckoutItemResponse): string {
  const cgst = Number.parseFloat(item.cgst ?? '');
  const sgst = Number.parseFloat(item.sgst ?? '');
  const total = (Number.isNaN(cgst) ? 0 : cgst) + (Number.isNaN(sgst) ? 0 : sgst);
  return total > 0 ? formatPercent(total) : '—';
}

export function SummaryRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
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
    <Inline justify="between" align="end" width="full" className={productChrome.summaryRow}>
      <Text as="span" color="secondary">
        {label}
      </Text>
      <Text as="span">{value}</Text>
    </Inline>
  );
}

/** Every line of a billed document, with the same columns wherever it is opened. */
export function SaleLineItemsTable({ items }: { items: CheckoutItemResponse[] }) {
  return (
    <Box overflow="auto">
      <Table className={cn(surfaceChrome.minW320, productChrome.historyItemsTable)}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Qty</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>MRP</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Unit price</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Discount</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Scheme</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>GST</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.numericCell}>Line total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={`${item.inventoryId ?? item.name}-${idx}`}>
              <TableCell>
                <Text weight="medium">{item.name ?? item.inventoryId ?? '—'}</Text>
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {item.quantity}
                {item.saleUnit ? ` ${item.saleUnit}` : ''}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {item.maximumRetailPrice ? formatCurrency(item.maximumRetailPrice) : '—'}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {formatCurrency(item.priceToRetail ?? 0)}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                {/* The discount rate the operator applied at sale, not the rupee value of it.
                    item.discount holds (MRP - selling price) x quantity, which rendered beside
                    this caption with no separator and read as one garbled figure. */}
                {item.saleAdditionalDiscount ? formatPercent(item.saleAdditionalDiscount) : '—'}
              </TableCell>
              <TableCell className={surfaceChrome.numericCell}>{schemeLabel(item)}</TableCell>
              <TableCell className={surfaceChrome.numericCell}>{gstLabel(item)}</TableCell>
              <TableCell className={surfaceChrome.numericCell}>
                <Text weight="semibold">
                  {/* What the line was billed, taxes and discounts included. Multiplying rate by
                      quantity here disagreed with the invoice on every line that carried a
                      discount or a scheme. */}
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
  );
}

/** Subtotal through to the billed total, in the order the printed invoice states them. */
export function SaleTotals({
  subTotal,
  discountTotal,
  sgstAmount,
  cgstAmount,
  taxTotal,
  grandTotal,
}: {
  subTotal?: number | null;
  discountTotal?: number | null;
  sgstAmount?: number | null;
  cgstAmount?: number | null;
  taxTotal?: number | null;
  grandTotal?: number | null;
}) {
  return (
    <Box className={productChrome.historyTotalsPanel}>
      <SummaryRow label="Subtotal" value={formatCurrency(subTotal ?? 0)} />
      {discountTotal ? (
        <SummaryRow label="Discount" value={`− ${formatCurrency(discountTotal)}`} />
      ) : null}
      {sgstAmount ? <SummaryRow label="SGST" value={formatCurrency(sgstAmount)} /> : null}
      {cgstAmount ? <SummaryRow label="CGST" value={formatCurrency(cgstAmount)} /> : null}
      {/* Older sales carry the tax total but not the split between SGST and CGST. */}
      {!sgstAmount && !cgstAmount && taxTotal ? (
        <SummaryRow label="Tax" value={formatCurrency(taxTotal)} />
      ) : null}
      <SummaryRow label="Total" value={formatCurrency(grandTotal ?? 0)} total />
    </Box>
  );
}
