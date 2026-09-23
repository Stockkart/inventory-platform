import { openPdfPreview } from '@inventory-platform/product/print';
import { cafeKotApi } from '../api/cafe-kot.api';

export type PrintHandoff = (blob: Blob, fileName: string) => void;

/**
 * Hands a ticket to the printer the same way every other document in this app is printed.
 *
 * This is `openPdfPreview` from the invoice path (`core/product/src/lib/printDocument.ts`),
 * not a second mechanism: the server renders the thermal PDF, the browser opens it, and the
 * operator prints from the viewer, with a download fallback when a popup blocker refuses
 * the tab.
 *
 * It deliberately does not force `window.print()`. A kitchen ticket that opens a dialog by
 * itself behaves unlike the invoice beside it, and on a counter with one browser and two
 * printers it fires at whichever happens to be default rather than the kitchen roll.
 */
export const openForPrinting: PrintHandoff = (blob, fileName) => {
  openPdfPreview(blob, fileName);
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
