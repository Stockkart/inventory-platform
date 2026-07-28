import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Printer, Receipt } from 'lucide-react';
import { cartApi } from '../api/cart.api';
import type { PrinterType } from '../api/endpoints';
import {
  Box,
  Button,
  Icon,
  Inline,
  Modal,
  Spinner,
  Stack,
  Text,
  cn,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

export type { PrinterType };

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
  invoiceNo?: string;
  onError?: (message: string) => void;
}

const PRINTER_OPTIONS: Array<{
  value: PrinterType;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'NORMAL',
    title: 'Normal',
    description: 'Standard A4 for laser or inkjet printers',
    icon: FileText,
  },
  {
    value: 'DOT_MATRIX',
    title: 'Dot Matrix',
    description: 'Compact monospace layout on A4',
    icon: Printer,
  },
  {
    value: 'THERMAL_3INCH',
    title: 'Thermal (3-inch)',
    description: 'Narrow 80mm receipt-roll format',
    icon: Receipt,
  },
];

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
          <Text color="secondary">Choose a print layout for this invoice.</Text>
          <Box
            className={cn(productChrome.printOptionList, isGenerating && surfaceChrome.busyDim)}
            role="radiogroup"
            aria-label="Printer type"
          >
            {PRINTER_OPTIONS.map((option) => {
              const selected = printerType === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  fullWidth
                  align="start"
                  role="radio"
                  aria-checked={selected}
                  disabled={isGenerating}
                  className={cn(
                    productChrome.printOption,
                    selected && productChrome.printOptionSelected,
                  )}
                  onClick={() => {
                    if (!isGenerating) {
                      setPrinterType(option.value);
                    }
                  }}
                >
                  <Box className={productChrome.printOptionIcon} aria-hidden>
                    <Icon icon={option.icon} size="md" />
                  </Box>
                  <Box className={productChrome.printOptionBody}>
                    <Text as="span" className={productChrome.printOptionTitle}>
                      {option.title}
                    </Text>
                    <Text as="span" className={productChrome.printOptionDesc}>
                      {option.description}
                    </Text>
                  </Box>
                  <Box className={productChrome.printOptionRadio} aria-hidden />
                </Button>
              );
            })}
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
