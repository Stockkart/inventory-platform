import type { KeyboardEvent, ReactNode } from 'react';
import { Box, Button, Inline, Modal, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import { formatCustomerDisplayName } from '../lib/customerDisplay';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function targetMeta(target: CartTargetSummary): string {
  const parts = [
    target.secondaryLabel?.trim() || null,
    `${target.itemCount} item${target.itemCount === 1 ? '' : 's'}`,
    formatMoney(Number(target.grandTotal) || 0),
    target.customerPhone?.trim() || null,
  ].filter((part): part is string => Boolean(part));
  return parts.join(' · ');
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
  const activate = (purchaseId: string) => {
    if (isSubmitting) return;
    onSelect(purchaseId);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, purchaseId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(purchaseId);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} size="md">
      <Modal.Header title={title} onClose={onCancel} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            {choosePrompt}{' '}
            <Text as="span" weight="semibold">
              {productLabel}
            </Text>
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
            {targets.length === 0 ? (
              <Text variant="caption" color="muted">
                None open yet. Use the button above to start a new one.
              </Text>
            ) : (
              targets.map((target) => (
                <Box
                  key={target.purchaseId}
                  role="button"
                  tabIndex={isSubmitting ? -1 : 0}
                  aria-disabled={isSubmitting || undefined}
                  className={surfaceChrome.pickerRow}
                  onClick={() => activate(target.purchaseId)}
                  onKeyDown={(event) => onRowKeyDown(event, target.purchaseId)}
                >
                  <Stack gap="xs">
                    <Text weight="semibold">{formatCustomerDisplayName(target.label)}</Text>
                    <Text variant="caption" color="muted">
                      {targetMeta(target)}
                    </Text>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Inline gap="sm" justify="end" width="full">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              {backLabel}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </Inline>
      </Modal.Footer>
    </Modal>
  );
}
