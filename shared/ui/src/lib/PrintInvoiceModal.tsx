import { useState } from 'react';
import { cartApi } from '@inventory-platform/api';
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

  if (!isOpen) return null;

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
      const message =
        err instanceof Error ? err.message : 'Failed to download invoice PDF';
      onError?.(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isGenerating) onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-invoice-modal-title"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="print-invoice-modal-title" className={styles.modalTitle}>
            Print Invoice
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.prompt}>Select printer type for this invoice:</p>
          <div className={styles.printerOptions}>
            <label className={styles.option}>
              <div className={styles.optionRow}>
                <input
                  type="radio"
                  name="printerType"
                  value="NORMAL"
                  checked={printerType === 'NORMAL'}
                  onChange={() => setPrinterType('NORMAL')}
                  disabled={isGenerating}
                />
                <span className={styles.optionLabel}>Normal</span>
              </div>
              <span className={styles.optionHint}>Standard A4, laser/inkjet</span>
            </label>
            <label className={styles.option}>
              <div className={styles.optionRow}>
                <input
                  type="radio"
                  name="printerType"
                  value="DOT_MATRIX"
                  checked={printerType === 'DOT_MATRIX'}
                  onChange={() => setPrinterType('DOT_MATRIX')}
                  disabled={isGenerating}
                />
                <span className={styles.optionLabel}>Dot Matrix</span>
              </div>
              <span className={styles.optionHint}>
                Thermal / dot matrix compatible
              </span>
            </label>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className={styles.spinner} aria-hidden />
                Generating…
              </>
            ) : (
              'Generate PDF'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
