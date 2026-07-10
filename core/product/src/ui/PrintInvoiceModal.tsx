import { useState } from 'react';
import { cartApi } from '../api/cart.api';
import {
  Button,
  Inline,
  Modal,
  RadioGroup,
  Spinner,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './PrintInvoiceModal.module.css';

export type PrinterType = 'NORMAL' | 'DOT_MATRIX';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
  invoiceNo?: string;
  onError?: (message: string) => void;
}

export function PrintInvoiceModal({
  isOpen,
  onClose,
  purchaseId,
  invoiceNo,
  onError,
}: PrintInvoiceModalProps) {
  const [printerType, setPrinterType] = useState<PrinterType>('NORMAL');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await cartApi.getInvoicePdf(purchaseId, printerType);
      const url = window.URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceNo || purchaseId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download invoice PDF';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = isGenerating ? undefined : onClose;

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <Modal.Header title="Print Invoice" onClose={handleClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary" className={styles.prompt}>
            Select printer type for this invoice:
          </Text>
          <RadioGroup
            name="printerType"
            value={printerType}
            onChange={(value) => {
              if (!isGenerating) {
                setPrinterType(value as PrinterType);
              }
            }}
            className={isGenerating ? styles.disabledOptions : styles.printerOptions}
            options={[
              {
                value: 'NORMAL',
                label: (
                  <Stack gap="xs">
                    <Text weight="semibold" className={styles.optionLabel}>
                      Normal
                    </Text>
                    <Text variant="caption" color="secondary" className={styles.optionHint}>
                      Standard A4, laser/inkjet
                    </Text>
                  </Stack>
                ),
              },
              {
                value: 'DOT_MATRIX',
                label: (
                  <Stack gap="xs">
                    <Text weight="semibold" className={styles.optionLabel}>
                      Dot Matrix
                    </Text>
                    <Text variant="caption" color="secondary" className={styles.optionHint}>
                      Thermal / dot matrix compatible
                    </Text>
                  </Stack>
                ),
              },
            ]}
          />
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isGenerating}
          className={styles.cancelBtn}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
          className={styles.generateBtn}
        >
          {isGenerating ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" className={styles.spinner} />
              Generating…
            </Inline>
          ) : (
            'Generate PDF'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
