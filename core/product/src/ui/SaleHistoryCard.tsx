import { useState } from 'react';
import type { Purchase } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
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
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';
import styles from './HistoryRecordList.module.css';

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

export function SaleHistoryCard({ purchase }: { purchase: Purchase }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const paymentSplitLine = formatPaymentSplit({
    cashAmount: purchase.cashAmount ?? undefined,
    onlineAmount: purchase.onlineAmount ?? undefined,
    creditAmount: purchase.creditAmount ?? undefined,
  });

  const statusVariant =
    purchase.status === 'COMPLETED'
      ? 'success'
      : purchase.status === 'CANCELLED'
        ? 'danger'
        : 'neutral';

  return (
    <>
      <Card className={styles.recordCard}>
        <CardBody>
          <Stack gap="md">
            <Inline
              className={styles.recordHeader}
              justify="between"
              align="start"
              gap="md"
            >
              <DetailLine label="Invoice" value={purchase.invoiceNo} />
              <Inline className={styles.recordActions} gap="sm" align="center">
                <DetailLine label="Date" value={formatDate(purchase.soldAt)} />
                {purchase.status === 'COMPLETED' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPrintModal(true)}
                  >
                    Print
                  </Button>
                ) : null}
                {purchase.items.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Hide items' : 'View items'}
                  </Button>
                ) : null}
              </Inline>
            </Inline>

            <Grid columns={2} gap="sm" className={styles.recordDetails}>
              <DetailLine
                label="Customer"
                value={purchase.customerName ?? '—'}
              />
              <DetailLine label="Phone" value={purchase.customerPhone ?? '—'} />
              <DetailLine label="Total" value={formatCurrency(purchase.grandTotal)} />
              <Inline gap="xs" align="center">
                <Text variant="caption" color="secondary" weight="semibold">
                  Status:
                </Text>
                <Badge variant={statusVariant}>{purchase.status}</Badge>
              </Inline>
              <DetailLine
                label="Payment"
                value={formatPaymentMethod(purchase.paymentMethod)}
              />
              {paymentSplitLine ? (
                <DetailLine label="Split" value={paymentSplitLine} />
              ) : null}
              <DetailLine label="Items" value={String(purchase.items.length)} />
            </Grid>

            {expanded && purchase.items.length > 0 ? (
              <Stack gap="sm" className={styles.breakdownWrap}>
                <Text
                  variant="caption"
                  color="secondary"
                  weight="semibold"
                  className={styles.breakdownTitle}
                >
                  Line items
                </Text>
                <Box className={styles.breakdownScroll}>
                  <Table className={styles.breakdownTable}>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell>Qty</TableHeaderCell>
                        <TableHeaderCell>Unit price</TableHeaderCell>
                        <TableHeaderCell>Line total</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchase.items.map((item, idx) => (
                        <TableRow key={`${item.inventoryId ?? item.name}-${idx}`}>
                          <TableCell>
                            {item.name ?? item.inventoryId ?? '—'}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {formatCurrency(item.priceToRetail ?? 0)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              (item.priceToRetail ?? 0) * (item.quantity ?? 0)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            ) : null}
          </Stack>
        </CardBody>
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
