/**
 * Wording for a dot matrix print. The backend decides which situation a print is in
 * (`PrintJobPlan.action`, `PrintOutcomeResult.outcome`) and whether the modal may close; this
 * only words it. Nothing here decides anything.
 */
import type {
  PrintDownload,
  PrintJobPlan,
  PrintOutcomeResult,
} from '@inventory-platform/product/types';

export type PrintMessageChannel = 'success' | 'info' | 'error';

export interface PrintMessage {
  channel: PrintMessageChannel;
  message: string;
  shouldClose: boolean;
  /** The printer file to save, when the backend said to hand it over. */
  download: PrintDownload | null;
}

/** Exact wording required by the design spec (section 4.2 step 3). */
export const PRINTED_MESSAGE = 'Sent to printer';

/**
 * @param documentLabel lower-case display noun, e.g. "invoice", "estimate", "credit note".
 */
export function describePrint(
  plan: PrintJobPlan,
  outcome: PrintOutcomeResult | null,
  documentLabel: string,
): PrintMessage {
  if (plan.action === 'IN_PROGRESS') {
    return {
      channel: 'info',
      message: `This ${documentLabel} is already on its way to the printer.`,
      shouldClose: true,
      download: null,
    };
  }
  if (plan.action === 'DOWNLOAD' || !outcome) {
    return {
      channel: 'info',
      message: 'Printer file downloaded. Send it straight to the printer; do not open it first.',
      shouldClose: true,
      download: plan.download,
    };
  }

  const download = outcome.downloadInstead ? plan.download : null;
  const close = outcome.shouldClose;
  switch (outcome.outcome) {
    case 'PRINTED':
      return { channel: 'success', message: PRINTED_MESSAGE, shouldClose: close, download };
    case 'FAILED_PRINTER':
      return {
        channel: 'error',
        message: `Print failed: ${outcome.error ?? 'the printer reported an error'}`,
        shouldClose: close,
        download,
      };
    case 'STILL_QUEUED':
      return {
        channel: 'info',
        message:
          'Sent to the printer - still printing. Check the print bridge window if it does not finish shortly.',
        shouldClose: close,
        download,
      };
    case 'BRIDGE_UNREACHABLE':
      return {
        channel: 'error',
        message: 'Print bridge not running. Printer file downloaded instead.',
        shouldClose: close,
        download,
      };
    case 'ALREADY_SENT':
      return {
        channel: 'info',
        message: `This ${documentLabel} was already sent to the printer moments ago.`,
        shouldClose: close,
        download,
      };
    case 'BRIDGE_REJECTED':
      return {
        channel: 'error',
        message: `Print bridge refused the job${
          outcome.error ? `: ${outcome.error}` : ''
        }. It may already have printed - check the printer before trying again.`,
        shouldClose: close,
        download,
      };
  }
}
