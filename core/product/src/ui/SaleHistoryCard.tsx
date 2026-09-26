import { useState } from 'react';
import type { Purchase } from '@inventory-platform/product/types';
import { formatCustomerDisplayName } from '../lib/customerDisplay';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import { SaleLineItemsTable, SaleTotals, formatCurrency } from './SaleLineItems';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { useNotify } from '@inventory-platform/session';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';

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

export function SaleHistoryCard({ purchase }: { purchase: Purchase }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;

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
            <SaleLineItemsTable items={purchase.items} />

            <SaleTotals
              subTotal={purchase.subTotal}
              discountTotal={purchase.discountTotal}
              sgstAmount={purchase.sgstAmount}
              cgstAmount={purchase.cgstAmount}
              taxTotal={purchase.taxTotal}
              grandTotal={purchase.grandTotal}
            />
          </Box>
        ) : null}
      </Card>
      <PrintInvoiceModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseId={purchase.purchaseId}
        invoiceNo={purchase.invoiceNo}
        onError={(msg) => msg && notifyError(msg)}
        onSuccess={(msg) => msg && notifySuccess(msg)}
        onInfo={(msg) => msg && notifyInfo(msg)}
      />
    </>
  );
}
