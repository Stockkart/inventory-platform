import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Printer, Receipt } from 'lucide-react';
import { cartApi } from '../api/cart.api';
import { invoiceSettingsApi } from '../api/invoice-settings.api';
import type { PrinterType } from '../api/endpoints';
import {
  Alert,
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
    description: '10×12 in text file for impact printers',
    icon: Printer,
  },
  {
    value: 'THERMAL_3INCH',
    title: 'Thermal (3-inch)',
    description: 'Narrow 75mm receipt-roll format',
    icon: Receipt,
  },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function openPdfPreview(blob: Blob, fallbackName: string) {
  const url = window.URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    downloadBlob(blob, fallbackName);
  } else {
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}

export function PrintInvoiceModal({
  isOpen,
  onClose,
  purchaseId,
  invoiceNo,
  onError,
}: PrintInvoiceModalProps) {
  const [printerType, setPrinterType] = useState<PrinterType>('NORMAL');
  const [shopDefault, setShopDefault] = useState<PrinterType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const settings = await invoiceSettingsApi.get();
        if (cancelled) return;
        const next = settings.defaultPrinterType;
        setShopDefault(next);
        setPrinterType(next);
      } catch {
        if (!cancelled) {
          setShopDefault(null);
          setPrinterType('NORMAL');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handlePreviewPdf = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await cartApi.getInvoicePdf(purchaseId, printerType);
      openPdfPreview(pdfBlob, `invoice-${invoiceNo || purchaseId}.pdf`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download invoice PDF';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPrintFile = async () => {
    setIsGenerating(true);
    try {
      const textBlob = await cartApi.getInvoiceDotMatrixText(purchaseId);
      // .prn, not .txt. The file is a printer stream: it opens with the codes
      // that reset the printer and set its pitch, and Windows hands a .txt to
      // Notepad, which reads those bytes as characters and prints what it read.
      downloadBlob(textBlob, `invoice-${invoiceNo || purchaseId}.prn`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download the printer file';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = isGenerating ? undefined : onClose;
  const isDotMatrix = printerType === 'DOT_MATRIX';

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
              const isDefault = shopDefault === option.value;
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
                      {isDefault ? ' (Shop default)' : ''}
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
          {isDotMatrix ? (
            <Alert variant="info">
              Send the .prn straight to the printer — <code>copy /b invoice-….prn PRN</code> on
              Windows, or <code>lp -o raw</code> elsewhere. Do not open it first: it carries the
              codes that set condensed pitch, and only the printer reads them as codes. Anything
              that opens it reads them as characters and prints those instead. The bill is 137
              characters wide, which needs condensed to fit the 8 inches an 80-column printer
              paints; the extra 10×12 paper beside the holes cannot be used. Do not print the PDF on
              the dot-matrix.
            </Alert>
          ) : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
          Cancel
        </Button>
        {isDotMatrix ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handlePreviewPdf()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Inline gap="sm" align="center">
                <Spinner size="sm" />
                Generating…
              </Inline>
            ) : (
              'Preview PDF'
            )}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="solid"
          onClick={() => void (isDotMatrix ? handleDownloadPrintFile() : handlePreviewPdf())}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
              Generating…
            </Inline>
          ) : isDotMatrix ? (
            'Download printer file'
          ) : (
            'Generate PDF'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
