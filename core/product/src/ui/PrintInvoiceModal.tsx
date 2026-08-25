import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Printer, Receipt } from 'lucide-react';
import { cartApi } from '../api/cart.api';
import { invoiceSettingsApi } from '../api/invoice-settings.api';
import {
  PrintBridgeError,
  describeDuplicateJob,
  describePrintOutcome,
  isBridgeUp,
  pollJobOutcome,
  sendToBridge,
} from '../lib/printBridge';
import type { BridgeHealth, PrintOutcomeReport } from '../lib/printBridge';
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
  /** Defaults to "Invoice"; use "Estimate" for quote PDFs. */
  documentLabel?: string;
  onError?: (message: string) => void;
  /** Called once the bridge confirms a print actually reached the printer. */
  onSuccess?: (message: string) => void;
  /**
   * Called for outcomes that are neither success nor failure: the bridge
   * suppressed a duplicate print of an invoice already on its way, or the
   * job was still queued when polling stopped watching it.
   */
  onInfo?: (message: string) => void;
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
  documentLabel = 'Invoice',
  onError,
  onSuccess,
  onInfo,
}: PrintInvoiceModalProps) {
  const [printerType, setPrinterType] = useState<PrinterType>('NORMAL');
  const [shopDefault, setShopDefault] = useState<PrinterType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bridge, setBridge] = useState<BridgeHealth | null>(null);

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

  // Probe the local print bridge whenever the modal opens. Never blocks the UI:
  // isBridgeUp resolves to null on any failure, and the modal stays usable.
  useEffect(() => {
    if (!isOpen) {
      setBridge(null);
      return;
    }
    let cancelled = false;
    void isBridgeUp().then((health) => {
      if (!cancelled) {
        setBridge(health);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handlePreviewPdf = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob = await cartApi.getInvoicePdf(purchaseId, printerType);
      const slug = documentLabel.toLowerCase().replace(/\s+/g, '-');
      openPdfPreview(pdfBlob, `${slug}-${invoiceNo || purchaseId}.pdf`);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to download ${documentLabel.toLowerCase()} PDF`;
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPrintFile = async () => {
    setIsGenerating(true);
    try {
      const textBlob = await cartApi.getInvoiceDotMatrixText(purchaseId);
      const slug = documentLabel.toLowerCase().replace(/\s+/g, '-');
      downloadBlob(textBlob, `${slug}-${invoiceNo || purchaseId}.txt`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download print file';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Routes a polled outcome or a duplicate-job notice to the right feedback
  // channel, and closes the modal only when the report says it is safe to -
  // a FAILED print stays on screen so the operator sees it and can retry.
  const reportOutcome = (report: PrintOutcomeReport) => {
    if (report.channel === 'success') {
      onSuccess?.(report.message);
    } else if (report.channel === 'info') {
      onInfo?.(report.message);
    } else {
      onError?.(report.message);
    }
    if (report.shouldClose) {
      onClose();
    }
  };

  const handlePrintToBridge = async () => {
    setIsGenerating(true);
    let textBlob: Blob | null = null;
    try {
      textBlob = await cartApi.getInvoiceDotMatrixText(purchaseId);
      const text = await textBlob.text();
      // copies: 0 tells the bridge to apply its own configured
      // `defaultCopies` (e.g. original + customer copy for GST). Hardcoding
      // 1 here would silently override that setting on every print.
      const { jobId } = await sendToBridge({
        docType: 'INVOICE',
        docId: purchaseId,
        copies: 0,
        text,
      });
      // A 202 only means the job was queued, not that it printed - poll the
      // bridge's job history for the real outcome before telling the
      // operator anything.
      const outcome = await pollJobOutcome(jobId);
      reportOutcome(describePrintOutcome(outcome));
    } catch (err) {
      // Bridge missing or blocked by the browser: degrade to the download that
      // worked before the bridge existed, rather than failing the sale.
      if (err instanceof PrintBridgeError && err.kind === 'UNREACHABLE' && textBlob) {
        const slug = documentLabel.toLowerCase().replace(/\s+/g, '-');
        downloadBlob(textBlob, `${slug}-${invoiceNo || purchaseId}.txt`);
        setBridge(null);
        onError?.('Print bridge not running. Print file downloaded instead.');
        onClose();
        return;
      }
      if (err instanceof PrintBridgeError) {
        const duplicate = describeDuplicateJob(err);
        if (duplicate) {
          reportOutcome(duplicate);
          return;
        }
      }
      const message =
        err instanceof Error ? err.message : `Failed to print ${documentLabel.toLowerCase()}`;
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = isGenerating ? undefined : onClose;
  const isDotMatrix = printerType === 'DOT_MATRIX';

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <Modal.Header title={`Print ${documentLabel}`} onClose={handleClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            Choose a print layout for this {documentLabel.toLowerCase()}.
          </Text>
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
              {bridge
                ? `Prints directly to ${
                    bridge.selectedPrinter ?? 'the selected printer'
                  } via the print bridge on this computer.`
                : 'Print bridge not detected on this computer. The invoice will download as a .txt file that you can print at 10 CPI (Pica). Never print the PDF on a dot-matrix printer.'}
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
          onClick={() =>
            void (isDotMatrix
              ? bridge
                ? handlePrintToBridge()
                : handleDownloadPrintFile()
              : handlePreviewPdf())
          }
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
              {isDotMatrix && bridge ? 'Printing…' : 'Generating…'}
            </Inline>
          ) : isDotMatrix ? (
            bridge ? (
              'Print'
            ) : (
              'Download print file'
            )
          ) : (
            'Generate PDF'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
