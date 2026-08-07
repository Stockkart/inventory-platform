import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Printer, Receipt } from 'lucide-react';
import { creditNoteApi, type CreditNoteSource } from '../api/credit-note.api';
import { invoiceSettingsApi } from '../api/invoice-settings.api';
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

export type { PrinterType, CreditNoteSource };

interface PrintCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: CreditNoteSource;
  documentId: string;
  creditNoteNo?: string;
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
    description: 'Narrow 75mm receipt-roll format',
    icon: Receipt,
  },
];

export function PrintCreditNoteModal({
  isOpen,
  onClose,
  source,
  documentId,
  creditNoteNo,
  onError,
}: PrintCreditNoteModalProps) {
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const pdfBlob =
        source === 'customer'
          ? await creditNoteApi.getCustomerCreditNotePdf(documentId, printerType)
          : await creditNoteApi.getVendorCreditNotePdf(documentId, printerType);
      const url = window.URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');
      const filePrefix = source === 'vendor' ? 'debit-note' : 'credit-note';

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filePrefix}-${creditNoteNo || documentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : source === 'vendor'
          ? 'Failed to download debit note PDF'
          : 'Failed to download credit note PDF';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = isGenerating ? undefined : onClose;
  const modalTitle = source === 'vendor' ? 'Print Debit Note' : 'Print Credit Note';
  const modalHint =
    source === 'vendor'
      ? 'Choose a print layout for this debit note.'
      : 'Choose a print layout for this credit note.';

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <Modal.Header title={modalTitle} onClose={handleClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">{modalHint}</Text>
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
          disabled={isGenerating || !documentId}
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
