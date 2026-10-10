import type { PrintDocumentSource } from '@inventory-platform/product/types';
import { describePrint, type PrintMessage } from '../lib/printMessages';
import { downloadPrinterFile } from '../lib/printDocument';
import { usePrintBridgeStatusQuery, usePrintDocumentMutation } from '../queries/hooks';

interface UseDotMatrixPrintOptions {
  /** Probe the bridge only while the print modal is open on the dot matrix option. */
  enabled: boolean;
  source: PrintDocumentSource;
  documentId: string;
  /** Lower-case display noun for messages: "invoice", "estimate", "credit note". */
  documentLabel: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onInfo?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Dot matrix printing for a print modal. The backend decides everything - whether the bridge
 * counts as present, whether to print or download, what the result means and whether the modal
 * may close. This hook carries those answers to the screen: it saves the printer file when told
 * to and routes the worded message to the right toast.
 */
export function useDotMatrixPrint({
  enabled,
  source,
  documentId,
  documentLabel,
  onClose,
  onSuccess,
  onInfo,
  onError,
}: UseDotMatrixPrintOptions) {
  const statusQuery = usePrintBridgeStatusQuery(enabled);
  const mutation = usePrintDocumentMutation();

  const announce = (message: PrintMessage) => {
    if (message.download) {
      downloadPrinterFile(message.download);
    }
    if (message.channel === 'success') {
      onSuccess?.(message.message);
    } else if (message.channel === 'info') {
      onInfo?.(message.message);
    } else {
      onError?.(message.message);
    }
    if (message.shouldClose) {
      onClose();
    }
  };

  const print = async () => {
    const observation = statusQuery.data?.observation ?? {
      reachable: false,
      version: null,
      selectedPrinter: null,
    };
    try {
      const { plan, outcome } = await mutation.mutateAsync({
        source,
        documentId,
        bridge: observation,
      });
      announce(describePrint(plan, outcome, documentLabel));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : `Failed to print the ${documentLabel}`);
    }
  };

  const status = statusQuery.data?.status ?? null;
  return {
    status,
    checking: statusQuery.isFetching,
    /** True when the backend found a bridge to print through; otherwise the action downloads. */
    printsThroughBridge: status != null && status.state !== 'NOT_DETECTED',
    isPrinting: mutation.isPending,
    print,
  };
}
