import { useState } from 'react';
import type { Purchase } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Icon,
  IconButton,
  Inline,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';
import { Printer } from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { useNotify } from '@inventory-platform/session';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';

interface PurchaseCardProps {
  purchase: Purchase;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Inline justify="between" align="start" gap="md">
      <Text
        variant="caption"
        weight="semibold"
        color="secondary"
        className={productChrome.detailLabel}
      >
        {label}
      </Text>
      <Box flex="1">{children}</Box>
    </Inline>
  );
}

function PriceRow({
  label,
  value,
  valueClassName,
  rowClassName,
  valueColor,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  rowClassName?: string;
  valueColor?: 'primary' | 'secondary' | 'muted' | 'success' | 'danger';
}) {
  return (
    <Inline justify="between" align="center" gap="md" className={rowClassName}>
      <Text color="secondary">{label}</Text>
      <Text weight="medium" color={valueColor} className={valueClassName}>
        {value}
      </Text>
    </Inline>
  );
}

export function PurchaseCard({ purchase }: PurchaseCardProps) {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;

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
    <Card>
      <CardBody>
        <Stack gap="md">
          <Box margin="none" mb="md">
            <Inline justify="between" align="start" gap="md" flexWrap>
              <Stack gap="xs" flex="1">
                <Text variant="heading3" weight="semibold">
                  {purchase.invoiceNo}
                </Text>
                <Text variant="caption" color="muted">
                  ID: {purchase.invoiceId}
                </Text>
                <Text variant="caption" color="muted">
                  Billing Mode: {purchase.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
                </Text>
              </Stack>
              <Inline gap="sm" align="center">
                {purchase.status === 'COMPLETED' ? (
                  <IconButton
                    onClick={() => setShowPrintModal(true)}
                    label="Print Invoice"
                    title="Print Invoice"
                  >
                    <Icon icon={Printer} size="sm" />
                  </IconButton>
                ) : null}
                <Badge variant={statusVariant}>{purchase.status}</Badge>
              </Inline>
            </Inline>
          </Box>

          {purchase.items && purchase.items.length > 0 ? (
            <Box className={productChrome.cardSectionDivider}>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                aria-expanded={isItemsExpanded}
                aria-label={isItemsExpanded ? 'Collapse items' : 'Expand items'}
              >
                <Inline justify="between" align="center" width="full">
                  <Text variant="heading4" weight="semibold">
                    Items
                  </Text>
                  <Text color="secondary">{isItemsExpanded ? '▼' : '▲'}</Text>
                </Inline>
              </Button>
              {isItemsExpanded ? (
                <Stack gap="sm" padding="none" className={productChrome.mtSmHalf}>
                  {purchase.items.map((item, index) => (
                    <Inline
                      key={index}
                      justify="between"
                      align="start"
                      gap="md"
                      padding="sm"
                      bg="surface"
                      border
                      rounded="md"
                      width="full"
                    >
                      <Stack gap="xs" flex="1">
                        <Text weight="medium">{item.name}</Text>
                        <Text variant="caption" color="secondary">
                          Qty: {item.quantity}
                        </Text>
                        <Text variant="caption" color="secondary">
                          Mode: {item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
                        </Text>
                      </Stack>
                      <Stack gap="xs" align="end">
                        <Text weight="medium">
                          ₹{item.priceToRetail.toFixed(2)} × {item.quantity} = ₹
                          {(item.priceToRetail * item.quantity).toFixed(2)}
                        </Text>
                        {item.discount > 0 ? (
                          <Text variant="caption" color="success">
                            Discount: ₹{item.discount.toFixed(2)}
                          </Text>
                        ) : null}
                        {item.costTotal != null ||
                        item.profit != null ||
                        item.marginPercent != null ? (
                          <Text variant="caption" color="muted">
                            {item.costTotal != null ? (
                              <>Cost: ₹{item.costTotal.toFixed(2)}</>
                            ) : null}
                            {item.profit != null ? <> | Profit: ₹{item.profit.toFixed(2)}</> : null}
                            {item.marginPercent != null ? (
                              <> | Margin: {item.marginPercent.toFixed(1)}%</>
                            ) : null}
                          </Text>
                        ) : null}
                      </Stack>
                    </Inline>
                  ))}
                </Stack>
              ) : null}
            </Box>
          ) : null}

          <Stack gap="md">
            <Stack
              gap="sm"
              padding="md"
              bg="surface"
              border
              rounded="md"
              className={productChrome.mbSm}
            >
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                aria-expanded={isPriceExpanded}
                aria-label={isPriceExpanded ? 'Collapse price details' : 'Expand price details'}
              >
                <Inline justify="between" align="center" width="full">
                  <Text color="secondary">Price Details</Text>
                  <Text color="secondary">{isPriceExpanded ? '▼' : '▲'}</Text>
                </Inline>
              </Button>
              {isPriceExpanded ? (
                <Stack gap="xs">
                  <PriceRow label="Subtotal:" value={`₹${purchase.subTotal.toFixed(2)}`} />
                  {purchase.discountTotal > 0 ? (
                    <PriceRow
                      label="Discount:"
                      value={`-₹${purchase.discountTotal.toFixed(2)}`}
                      valueColor="success"
                    />
                  ) : null}
                  {purchase.taxTotal > 0 ? (
                    <PriceRow label="Tax:" value={`₹${purchase.taxTotal.toFixed(2)}`} />
                  ) : null}
                  <PriceRow
                    label="Grand Total:"
                    value={`₹${purchase.grandTotal.toFixed(2)}`}
                    valueClassName={productChrome.priceGrandValue}
                    rowClassName={productChrome.priceGrandRow}
                  />
                  {purchase.totalCost != null ||
                  purchase.revenueBeforeTax != null ||
                  purchase.revenueAfterTax != null ||
                  purchase.totalProfit != null ||
                  purchase.marginPercent != null ? (
                    <>
                      <Box className={productChrome.softDivider} />
                      {purchase.totalCost != null ? (
                        <PriceRow label="Total Cost:" value={`₹${purchase.totalCost.toFixed(2)}`} />
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
                        <PriceRow label="Profit:" value={`₹${purchase.totalProfit.toFixed(2)}`} />
                      ) : null}
                      {purchase.marginPercent != null ? (
                        <PriceRow label="Margin:" value={`${purchase.marginPercent.toFixed(1)}%`} />
                      ) : null}
                    </>
                  ) : null}
                </Stack>
              ) : null}
              {!isPriceExpanded ? (
                <PriceRow
                  label="Grand Total:"
                  value={`₹${purchase.grandTotal.toFixed(2)}`}
                  valueClassName={productChrome.priceGrandValue}
                />
              ) : null}
            </Stack>

            <Box className={productChrome.hairlineRule} />

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
              onSuccess={(msg) => msg && notifySuccess(msg)}
              onInfo={(msg) => msg && notifyInfo(msg)}
            />
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
