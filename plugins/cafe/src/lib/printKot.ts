import { cafeKotApi } from '../api/cafe-kot.api';

export type PrintHandoff = (blob: Blob, fileName: string) => void;

/**
 * Opens the document in a new tab and asks the browser to print it.
 *
 * This is v1's transport. It shows one print dialog per ticket, so a punch spanning two
 * departments shows two. That is the accepted v1 behaviour, not a defect to work around.
 * A silent transport would need a KOT document type in the Go print bridge, whose
 * PrintDocType is 'INVOICE' and nothing else, plus a re-release to every shop — neither
 * is frontend work.
 */
export const openForPrinting: PrintHandoff = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => win.print(), { once: true });
    return;
  }
  // Popup blocked: fall back to a download so the ticket is not simply lost.
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
};

/**
 * Fetch one ticket and hand it to the printer.
 *
 * Rejecting is meaningful: the caller marks that ticket FAILED and offers Retry. Retry
 * calls this function again. It never calls /reprint — the ticket has never printed, and
 * a slip stamped REPRINT for food the kitchen has not seen reads as a duplicate.
 */
export async function printKot(
  kotId: string,
  handoff: PrintHandoff = openForPrinting,
): Promise<void> {
  const blob = await cafeKotApi.getKotPdf(kotId);
  handoff(blob, `kot_${kotId}.pdf`);
}
