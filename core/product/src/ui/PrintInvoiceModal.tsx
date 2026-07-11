import { useState } from 'react';
import { cartApi } from '../api/cart.api';
import {
  Box,
  Button,
  Inline,
  Modal,
  RadioGroup,
  Spinner,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

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
          <Text color="secondary">Select printer type for this invoice:</Text>
          <Box className={isGenerating ? surfaceChrome.busyDim : undefined}>
            <RadioGroup
              name="printerType"
              value={printerType}
              onChange={(value) => {
                if (!isGenerating) {
                  setPrinterType(value as PrinterType);
                }
              }}
              options={[
                {
                  value: 'NORMAL',
                  label: (
                    <Stack gap="xs">
                      <Text weight="semibold">Normal</Text>
                      <Text variant="caption" color="secondary">
                        Standard A4, laser/inkjet
                      </Text>
                    </Stack>
                  ),
                },
                {
                  value: 'DOT_MATRIX',
                  label: (
                    <Stack gap="xs">
                      <Text weight="semibold">Dot Matrix</Text>
                      <Text variant="caption" color="secondary">
                        Thermal / dot matrix compatible
                      </Text>
                    </Stack>
                  ),
                },
              ]}
            />
          </Box>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
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
