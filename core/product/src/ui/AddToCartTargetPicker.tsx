import type { ReactNode } from 'react';
import { Box, Button, Modal, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Open sale quotation or estimate row for the product-search picker. */
export interface CartTargetSummary {
  purchaseId: string;
  label: string;
  customerPhone?: string | null;
  itemCount: number;
  grandTotal: number;
  /** Optional secondary line prefix (e.g. estimate number). */
  secondaryLabel?: string | null;
}

export interface AddToCartTargetPickerProps {
  open: boolean;
  productLabel: string;
  targets: CartTargetSummary[];
  isSubmitting: boolean;
  title: string;
  choosePrompt: ReactNode;
  newLabel: string;
  listAriaLabel: string;
  onSelect: (purchaseId: string) => void;
  onNew: () => void;
  onCancel: () => void;
  /** Return to destination chooser (Sell vs Estimate). */
  onBack?: () => void;
  backLabel?: string;
}

export function AddToCartTargetPicker({
  open,
  productLabel,
  targets,
  isSubmitting,
  title,
  choosePrompt,
  newLabel,
  listAriaLabel,
  onSelect,
  onNew,
  onCancel,
  onBack,
  backLabel = 'Back',
}: AddToCartTargetPickerProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <Modal.Header title={title} onClose={onCancel} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            {choosePrompt} <Text weight="semibold">{productLabel}</Text>
          </Text>

          <Button
            type="button"
            variant="outline"
            fullWidth
            className={surfaceChrome.dashedBorder}
            onClick={onNew}
            disabled={isSubmitting}
          >
            {newLabel}
          </Button>

          <Stack gap="sm" aria-label={listAriaLabel} className={surfaceChrome.scrollPanel50}>
            {targets.map((target) => (
              <Button
                key={target.purchaseId}
                type="button"
                variant="outline"
                onClick={() => onSelect(target.purchaseId)}
                disabled={isSubmitting}
                className={surfaceChrome.pickerBtn}
              >
                <Text weight="semibold">{target.label}</Text>
                <Text variant="caption" color="muted">
                  {target.secondaryLabel ? `${target.secondaryLabel} · ` : ''}
                  {target.itemCount} item{target.itemCount === 1 ? '' : 's'} ·{' '}
                  {formatMoney(Number(target.grandTotal) || 0)}
                  {target.customerPhone ? ` · ${target.customerPhone}` : ''}
                </Text>
              </Button>
            ))}
          </Stack>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Box display="flex" width="full" justify="between" align="center" gap="md">
          {onBack ? (
            <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
              {backLabel}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </Box>
      </Modal.Footer>
    </Modal>
  );
}
