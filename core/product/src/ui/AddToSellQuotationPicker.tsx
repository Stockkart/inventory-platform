import type { QuotationSummary } from '@inventory-platform/product/types';
import { AddToCartTargetPicker } from './AddToCartTargetPicker';

export interface AddToSellQuotationPickerProps {
  open: boolean;
  productLabel: string;
  quotations: QuotationSummary[];
  isSubmitting: boolean;
  onSelect: (purchaseId: string) => void;
  onNewQuotation: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export function AddToSellQuotationPicker({
  open,
  productLabel,
  quotations,
  isSubmitting,
  onSelect,
  onNewQuotation,
  onCancel,
  onBack,
}: AddToSellQuotationPickerProps) {
  return (
    <AddToCartTargetPicker
      open={open}
      productLabel={productLabel}
      targets={quotations.map((q) => ({
        purchaseId: q.purchaseId,
        label: q.customerName,
        customerPhone: q.customerPhone,
        itemCount: q.itemCount,
        grandTotal: Number(q.grandTotal) || 0,
      }))}
      isSubmitting={isSubmitting}
      title="Add to quotation"
      choosePrompt="Choose which open sale should include"
      newLabel="+ New quotation"
      listAriaLabel="Open quotations"
      onSelect={onSelect}
      onNew={onNewQuotation}
      onCancel={onCancel}
      onBack={onBack}
      backLabel="Back"
    />
  );
}
