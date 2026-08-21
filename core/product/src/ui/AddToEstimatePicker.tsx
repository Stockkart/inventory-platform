import type { EstimateSummary } from '@inventory-platform/product/types';
import { AddToCartTargetPicker } from './AddToCartTargetPicker';

export interface AddToEstimatePickerProps {
  open: boolean;
  productLabel: string;
  estimates: EstimateSummary[];
  isSubmitting: boolean;
  onSelect: (purchaseId: string) => void;
  onNewEstimate: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export function AddToEstimatePicker({
  open,
  productLabel,
  estimates,
  isSubmitting,
  onSelect,
  onNewEstimate,
  onCancel,
  onBack,
}: AddToEstimatePickerProps) {
  return (
    <AddToCartTargetPicker
      open={open}
      productLabel={productLabel}
      targets={estimates.map((e) => ({
        purchaseId: e.purchaseId,
        label: e.customerName,
        customerPhone: e.customerPhone,
        itemCount: e.itemCount,
        grandTotal: Number(e.grandTotal) || 0,
        secondaryLabel: e.estimateNo,
      }))}
      isSubmitting={isSubmitting}
      title="Add to estimate"
      choosePrompt="Choose which open estimate should include"
      newLabel="+ New estimate"
      listAriaLabel="Open estimates"
      onSelect={onSelect}
      onNew={onNewEstimate}
      onCancel={onCancel}
      onBack={onBack}
      backLabel="Back"
    />
  );
}
