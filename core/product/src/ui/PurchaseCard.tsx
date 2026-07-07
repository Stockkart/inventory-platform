import { useState } from 'react';
import type { Purchase } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Icon,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { Printer } from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import styles from './PurchaseCard.module.css';
import { useNotify } from '@inventory-platform/session';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';

interface PurchaseCardProps {
  purchase: Purchase;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Inline className={styles.detailRow} justify="between" align="start" gap="md">
      <Text className={styles.label} variant="caption" weight="semibold">
        {label}
      </Text>
      <Box className={styles.value}>{children}</Box>
    </Inline>
  );
}

function PriceRow({
  label,
  value,
  valueClassName,
  rowClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  rowClassName?: string;
}) {
  return (
    <Inline
      className={rowClassName ?? styles.priceRow}
      justify="between"
      align="center"
      gap="md"
    >
      <Text className={styles.priceLabel}>{label}</Text>
      <Text className={valueClassName ?? styles.priceValue}>{value}</Text>
    </Inline>
  );
}

export function PurchaseCard({ purchase }: PurchaseCardProps) {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { error: notifyError } = useNotify;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusVariant =
    purchase.status.toUpperCase() === 'COMPLETED'
      ? 'success'
      : purchase.status.toUpperCase() === 'PENDING'
        ? 'warning'
        : purchase.status.toUpperCase() === 'CANCELLED'
          ? 'danger'
          : 'neutral';

  const paymentSplitLine = formatPaymentSplit({
    cashAmount: purchase.cashAmount ?? undefined,
    onlineAmount: purchase.onlineAmount ?? undefined,
    creditAmount: purchase.creditAmount ?? undefined,
  });

  return (
    <Card className={styles.card}>
      <CardBody>
        <Stack gap="md">
          <Box className={styles.header}>
            <Inline
              className={styles.topRow}
              justify="between"
              align="start"
              gap="md"
            >
              <Stack gap="xs" className={styles.invoiceInfo}>
                <Text variant="heading3" weight="semibold" className={styles.invoiceNo}>
                  {purchase.invoiceNo}
                </Text>
                <Text variant="caption" color="muted" className={styles.invoiceId}>
                  ID: {purchase.invoiceId}
                </Text>
                <Text variant="caption" color="muted" className={styles.invoiceId}>
                  Billing Mode:{' '}
                  {purchase.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
                </Text>
              </Stack>
              <Inline className={styles.headerActions} gap="sm" align="center">
                {purchase.status === 'COMPLETED' ? (
                  <IconButton
                    className={styles.printBtn}
                    onClick={() => setShowPrintModal(true)}
                    label="Print Invoice"
                    title="Print Invoice"
                  >
                    <Icon icon={Printer} size="sm" />
                  </IconButton>
                ) : null}
                <Badge variant={statusVariant} className={styles.status}>
                  {purchase.status}
                </Badge>
              </Inline>
            </Inline>
          </Box>

          {purchase.items && purchase.items.length > 0 ? (
            <Box className={styles.itemsSection}>
              <Button
                type="button"
                variant="ghost"
                className={styles.expandButton}
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                aria-expanded={isItemsExpanded}
                aria-label={isItemsExpanded ? 'Collapse items' : 'Expand items'}
              >
                <Text variant="heading4" weight="semibold" className={styles.itemsTitle}>
                  Items
                </Text>
                <Text className={styles.expandIcon}>
                  {isItemsExpanded ? '▼' : '▲'}
                </Text>
              </Button>
              {isItemsExpanded ? (
                <Stack gap="sm" className={styles.itemsList}>
                  {purchase.items.map((item, index) => (
                    <Box key={index} className={styles.itemRow}>
                      <Stack gap="xs" className={styles.itemInfo}>
                        <Text weight="medium" className={styles.itemName}>
                          {item.name}
                        </Text>
                        <Text variant="caption" color="secondary" className={styles.itemQuantity}>
                          Qty: {item.quantity}
                        </Text>
                        <Text variant="caption" color="secondary" className={styles.itemQuantity}>
                          Mode: {item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
                        </Text>
                      </Stack>
                      <Stack gap="xs" className={styles.itemPricing}>
                        <Text className={styles.itemPrice}>
                          ₹{item.priceToRetail.toFixed(2)} × {item.quantity} = ₹
                          {(item.priceToRetail * item.quantity).toFixed(2)}
                        </Text>
                        {item.discount > 0 ? (
                          <Text variant="caption" color="secondary" className={styles.itemDiscount}>
                            Discount: ₹{item.discount.toFixed(2)}
                          </Text>
                        ) : null}
                        {item.costTotal != null ||
                        item.profit != null ||
                        item.marginPercent != null ? (
                          <Text variant="caption" color="secondary" className={styles.itemMargin}>
                            {item.costTotal != null ? (
                              <>Cost: ₹{item.costTotal.toFixed(2)}</>
                            ) : null}
                            {item.profit != null ? (
                              <>
                                {' '}
                                | Profit: ₹{item.profit.toFixed(2)}
                              </>
                            ) : null}
                            {item.marginPercent != null ? (
                              <> | Margin: {item.marginPercent.toFixed(1)}%</>
                            ) : null}
                          </Text>
                        ) : null}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : null}
            </Box>
          ) : null}

          <Stack gap="md" className={styles.details}>
            <Box className={styles.priceBreakdown}>
              <Button
                type="button"
                variant="ghost"
                className={styles.expandButton}
                onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                aria-expanded={isPriceExpanded}
                aria-label={
                  isPriceExpanded
                    ? 'Collapse price details'
                    : 'Expand price details'
                }
              >
                <Text className={styles.priceLabel}>Price Details</Text>
                <Text className={styles.expandIcon}>
                  {isPriceExpanded ? '▼' : '▲'}
                </Text>
              </Button>
              {isPriceExpanded ? (
                <Stack gap="xs">
                  <PriceRow
                    label="Subtotal:"
                    value={`₹${purchase.subTotal.toFixed(2)}`}
                  />
                  {purchase.discountTotal > 0 ? (
                    <PriceRow
                      label="Discount:"
                      value={`-₹${purchase.discountTotal.toFixed(2)}`}
                      valueClassName={`${styles.priceValue} ${styles.discountValue}`}
                    />
                  ) : null}
                  {purchase.taxTotal > 0 ? (
                    <PriceRow
                      label="Tax:"
                      value={`₹${purchase.taxTotal.toFixed(2)}`}
                    />
                  ) : null}
                  <PriceRow
                    label="Grand Total:"
                    value={`₹${purchase.grandTotal.toFixed(2)}`}
                    valueClassName={styles.grandTotalValue}
                    rowClassName={`${styles.priceRow} ${styles.grandTotalRow}`}
                  />
                  {purchase.totalCost != null ||
                  purchase.revenueBeforeTax != null ||
                  purchase.revenueAfterTax != null ||
                  purchase.totalProfit != null ||
                  purchase.marginPercent != null ? (
                    <>
                      <Divider className={styles.marginDivider} />
                      {purchase.totalCost != null ? (
                        <PriceRow
                          label="Total Cost:"
                          value={`₹${purchase.totalCost.toFixed(2)}`}
                        />
                      ) : null}
                      {purchase.revenueBeforeTax != null ? (
                        <PriceRow
                          label="Revenue (before tax):"
                          value={`₹${purchase.revenueBeforeTax.toFixed(2)}`}
                        />
                      ) : null}
                      {purchase.revenueAfterTax != null ? (
                        <PriceRow
                          label="Revenue (after tax):"
                          value={`₹${purchase.revenueAfterTax.toFixed(2)}`}
                        />
                      ) : null}
                      {purchase.totalProfit != null ? (
                        <PriceRow
                          label="Profit:"
                          value={`₹${purchase.totalProfit.toFixed(2)}`}
                        />
                      ) : null}
                      {purchase.marginPercent != null ? (
                        <PriceRow
                          label="Margin:"
                          value={`${purchase.marginPercent.toFixed(1)}%`}
                        />
                      ) : null}
                    </>
                  ) : null}
                </Stack>
              ) : null}
              {!isPriceExpanded ? (
                <PriceRow
                  label="Grand Total:"
                  value={`₹${purchase.grandTotal.toFixed(2)}`}
                  valueClassName={styles.grandTotalValue}
                />
              ) : null}
            </Box>

            <Divider className={styles.divider} />

            <DetailRow label="Payment Method:">
              <Stack gap="xs">
                <Text>{formatPaymentMethod(purchase.paymentMethod)}</Text>
                {paymentSplitLine ? (
                  <Text variant="caption" color="secondary">
                    {paymentSplitLine}
                  </Text>
                ) : null}
              </Stack>
            </DetailRow>
            <DetailRow label="Sold At:">
              <Text>{formatDate(purchase.soldAt)}</Text>
            </DetailRow>
            {purchase.customerName ? (
              <DetailRow label="Customer:">
                <Text>{purchase.customerName}</Text>
              </DetailRow>
            ) : null}
            {purchase.customerPhone ? (
              <DetailRow label="Phone:">
                <Text>{purchase.customerPhone}</Text>
              </DetailRow>
            ) : null}
            {purchase.customerAddress ? (
              <DetailRow label="Address:">
                <Text>{purchase.customerAddress}</Text>
              </DetailRow>
            ) : null}
          </Stack>

          {purchase.purchaseId ? (
            <PrintInvoiceModal
              isOpen={showPrintModal}
              onClose={() => setShowPrintModal(false)}
              purchaseId={purchase.purchaseId}
              invoiceNo={purchase.invoiceNo}
              onError={(msg) => msg && notifyError(msg)}
            />
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
