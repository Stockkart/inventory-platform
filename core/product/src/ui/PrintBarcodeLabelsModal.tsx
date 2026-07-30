import { useState } from 'react';
import { Printer } from 'lucide-react';
import { barcodesApi } from '../api/barcodes.api';
import { openBarcodeLabelPrintWindow } from '../lib/printBarcodeLabels';
import type { BarcodeLabelDto } from '../model/types';
import { Button, Icon, Inline, Modal, Spinner, Stack, Text } from '@inventory-platform/ui-kit';

export interface PrintBarcodeLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prefer productIds when labels should pull live name/company. */
  productIds?: string[];
  codes?: string[];
  /** Optional preloaded rows (skips labels API when provided). */
  labels?: BarcodeLabelDto[];
  onError?: (message: string) => void;
}

export function PrintBarcodeLabelsModal({
  isOpen,
  onClose,
  productIds,
  codes,
  labels: preloaded,
  onError,
}: PrintBarcodeLabelsModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const count = preloaded?.length ?? (productIds?.length ?? 0) + (codes?.length ?? 0);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      let rows = preloaded;
      if (!rows?.length) {
        rows = await barcodesApi.labels({
          ...(productIds?.length ? { productIds } : {}),
          ...(codes?.length ? { codes } : {}),
        });
      }
      if (!rows.length) {
        throw new Error('No barcode labels found');
      }
      openBarcodeLabelPrintWindow(rows);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print barcode labels';
      onError?.(message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleClose = isPrinting ? undefined : onClose;

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <Modal.Header title="Print barcode stickers" onClose={handleClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            Print stickers with a scan code and text under the bars (name, company).
          </Text>
          <Inline gap="sm" align="center">
            <Icon icon={Printer} size="sm" />
            <Text>
              {count} sticker{count === 1 ? '' : 's'}
            </Text>
          </Inline>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPrinting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={() => void handlePrint()}
          disabled={isPrinting || count < 1}
        >
          {isPrinting ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
              Preparing…
            </Inline>
          ) : (
            'Print'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
