import { useState } from 'react';
import type { EstimateSummary } from '@inventory-platform/product/types';
import { useNotify } from '@inventory-platform/session';
import { formatCustomerDisplayName } from '../lib/customerDisplay';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import { SaleLineItemsTable, SaleTotals, formatCurrency } from './SaleLineItems';
import { useEstimateDetailQuery } from '../queries/hooks';
import { PrintInvoiceModal } from './PrintInvoiceModal';

function formatDate(dateString?: string): string {
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

function EstimateCardActions({
  estimateState,
  busy,
  canConvert,
  canPrint,
  onEdit,
  onLock,
  onConvert,
  onDiscard,
  onPrint,
}: {
  estimateState: EstimateSummary['estimateState'];
  busy: boolean;
  canConvert: boolean;
  canPrint: boolean;
  onEdit: () => void;
  onLock: () => void;
  onConvert: () => void;
  onDiscard: () => void;
  onPrint: () => void;
}) {
  const isOpen = estimateState === 'OPEN';
  const isLocked = estimateState === 'LOCKED';
  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onEdit}>
        {isOpen ? 'Edit' : 'Open'}
      </Button>
      {canPrint ? (
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onPrint}>
          Print
        </Button>
      ) : null}
      {isOpen ? (
        <>
          <Button type="button" size="sm" variant="solid" disabled={busy} onClick={onLock}>
            {busy ? 'Locking…' : 'Lock'}
          </Button>
          {canConvert ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onConvert}>
              Convert to invoice
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDiscard}>
            Discard
          </Button>
        </>
      ) : null}
      {isLocked && canConvert ? (
        <Button type="button" size="sm" variant="solid" disabled={busy} onClick={onConvert}>
          {busy ? 'Converting…' : 'Convert to invoice'}
        </Button>
      ) : null}
    </>
  );
}

export function EstimateListCard({
  estimate,
  busy,
  onEdit,
  onLock,
  onConvert,
  onDiscard,
}: {
  estimate: EstimateSummary;
  busy: boolean;
  onEdit: () => void;
  onLock: () => void;
  onConvert: () => void;
  onDiscard: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;
  const canPrint = estimate.estimateState === 'LOCKED' || estimate.estimateState === 'CONVERTED';
  const canConvert =
    estimate.itemCount > 0 &&
    (estimate.estimateState === 'OPEN' || estimate.estimateState === 'LOCKED') &&
    estimate.billingMode !== 'BASIC';
  const estimateNo = estimate.estimateNo?.trim() || null;
  const customer = formatCustomerDisplayName(estimate.customerName);
  const phone = estimate.customerPhone?.trim() || '—';
  const email = estimate.customerEmail?.trim() || '—';

  const detailQuery = useEstimateDetailQuery(estimate.purchaseId, {
    enabled: expanded,
  });
  const items = detailQuery.data?.items ?? [];

  const statusVariant =
    estimate.estimateState === 'OPEN'
      ? 'success'
      : estimate.estimateState === 'LOCKED'
      ? 'info'
      : 'neutral';
  const statusLabel =
    estimate.estimateState === 'OPEN'
      ? 'Open'
      : estimate.estimateState === 'LOCKED'
      ? 'Locked'
      : estimate.estimateState === 'CONVERTED'
      ? 'Converted'
      : 'Discarded';

  const actionProps = {
    estimateState: estimate.estimateState,
    busy,
    canConvert,
    canPrint,
    onEdit,
    onLock,
    onConvert,
    onDiscard,
    onPrint: () => setShowPrintModal(true),
  };

  return (
    <>
      <Card className={productChrome.historyRecordCard}>
        <CardBody>
          <Box className={productChrome.salePickMain}>
            <Box className={productChrome.historyRecordHeader}>
              <Box className={productChrome.salePickTitleRow}>
                <Text as="p" className={productChrome.salePickInvoiceHint}>
                  Estimate
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
                {estimate.billingMode === 'REGULAR' ? (
                  <Badge variant="warning">Tax</Badge>
                ) : estimate.billingMode === 'BASIC' ? (
                  <Badge variant="neutral">Estimate-only</Badge>
                ) : null}
              </Box>
              <Box className={productChrome.historyRecordActions}>
                <Text as="p" className={productChrome.historyRecordAmount}>
                  {formatCurrency(estimate.grandTotal)}
                </Text>
                <Inline gap="xs" align="center">
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
                </Inline>
              </Box>
            </Box>

            <Box className={productChrome.salePickGrid}>
              <HistoryField
                label="Date"
                value={formatDate(estimate.updatedAt ?? estimate.createdAt)}
              />
              <HistoryField label="Customer" value={customer} />
              <HistoryField label="Phone" value={phone} muted={phone === '—'} />
              {email !== '—' ? <HistoryField label="Email" value={email} /> : null}
              <HistoryField label="Items" value={String(estimate.itemCount)} />
              {estimate.convertedToPurchaseId ? (
                <HistoryField label="Status" value="Converted — invoice is in History" />
              ) : null}
            </Box>

            {!expanded ? (
              <Box className={productChrome.historyRecordFooter}>
                <EstimateCardActions {...actionProps} />
              </Box>
            ) : null}
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
            ) : items.length === 0 ? (
              <Text variant="caption" color="secondary">
                No line items on this estimate.
              </Text>
            ) : (
              <>
                <SaleLineItemsTable
                  items={items}
                  lineRates={detailQuery.data?.taxSummary?.lineRates}
                />
                <SaleTotals
                  taxSummary={detailQuery.data?.taxSummary}
                  subTotal={detailQuery.data?.subTotal}
                  saleAdditionalDiscountTotal={detailQuery.data?.saleAdditionalDiscountTotal}
                  sgstAmount={detailQuery.data?.sgstAmount}
                  cgstAmount={detailQuery.data?.cgstAmount}
                  taxTotal={detailQuery.data?.taxTotal}
                  grandTotal={detailQuery.data?.grandTotal}
                />
              </>
            )}
          </Box>
        ) : null}

        {expanded ? (
          <Box
            className={cn(
              productChrome.historyRecordFooter,
              productChrome.historyRecordFooterAfterItems,
            )}
          >
            <EstimateCardActions {...actionProps} />
          </Box>
        ) : null}
      </Card>
      <PrintInvoiceModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseId={estimate.purchaseId}
        invoiceNo={estimate.estimateNo ?? undefined}
        documentLabel="Estimate"
        onError={(msg) => msg && notifyError(msg)}
        onSuccess={(msg) => msg && notifySuccess(msg)}
        onInfo={(msg) => msg && notifyInfo(msg)}
      />
    </>
  );
}
