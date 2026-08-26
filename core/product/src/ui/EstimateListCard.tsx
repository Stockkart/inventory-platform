import { useState } from 'react';
import type { EstimateSummary } from '@inventory-platform/product/types';
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
import { SaleLineItemsTable, SaleTotals } from './SaleLineItems';
import { useEstimateDetailQuery } from '../queries/hooks';
import { PrintInvoiceModal } from './PrintInvoiceModal';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

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
  isOpen,
  busy,
  canConvert,
  onEdit,
  onConvert,
  onDiscard,
}: {
  isOpen: boolean;
  busy: boolean;
  canConvert: boolean;
  onEdit: () => void;
  onConvert: () => void;
  onDiscard: () => void;
}) {
  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onEdit}>
        {isOpen ? 'Edit' : 'Open'}
      </Button>
      {isOpen ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="solid"
            disabled={busy || !canConvert}
            onClick={onConvert}
          >
            {busy ? 'Converting…' : 'Convert to invoice'}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDiscard}>
            Discard
          </Button>
        </>
      ) : null}
    </>
  );
}

export function EstimateListCard({
  estimate,
  busy,
  onEdit,
  onConvert,
  onDiscard,
}: {
  estimate: EstimateSummary;
  busy: boolean;
  onEdit: () => void;
  onConvert: () => void;
  onDiscard: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const isOpen = estimate.estimateState === 'OPEN';
  const estimateNo = estimate.estimateNo?.trim() || null;
  const customer = formatCustomerDisplayName(estimate.customerName);
  const phone = estimate.customerPhone?.trim() || '—';
  const email = estimate.customerEmail?.trim() || '—';

  const detailQuery = useEstimateDetailQuery(estimate.purchaseId, {
    enabled: expanded,
  });
  const items = detailQuery.data?.items ?? [];

  const statusVariant = isOpen ? 'success' : 'info';
  const statusLabel = isOpen ? 'Open' : 'Converted';

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
                  <Badge variant="neutral">Basic</Badge>
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
                    onClick={() => setShowPrintModal(true)}
                  >
                    Print
                  </Button>
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
                <EstimateCardActions
                  isOpen={isOpen}
                  busy={busy}
                  canConvert={estimate.itemCount > 0}
                  onEdit={onEdit}
                  onConvert={onConvert}
                  onDiscard={onDiscard}
                />
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
                <SaleLineItemsTable items={items} />

                {/* An estimate is a cart read before conversion, so it carries the same
                    totals a completed sale does. Showing only Qty, Unit price and Line
                    total made the same document look thinner here than in History. */}
                <SaleTotals
                  subTotal={detailQuery.data?.subTotal}
                  discountTotal={detailQuery.data?.discountTotal}
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
            <EstimateCardActions
              isOpen={isOpen}
              busy={busy}
              canConvert={estimate.itemCount > 0}
              onEdit={onEdit}
              onConvert={onConvert}
              onDiscard={onDiscard}
            />
          </Box>
        ) : null}
      </Card>
      <PrintInvoiceModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseId={estimate.purchaseId}
        invoiceNo={estimate.estimateNo ?? undefined}
        documentLabel="Estimate"
      />
    </>
  );
}
