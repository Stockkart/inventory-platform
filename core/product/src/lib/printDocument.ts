/**
 * How every printed document in this app reaches a printer.
 *
 * There is no local print bridge: the server renders a PDF, the browser opens it, and the
 * operator prints from the viewer. `PrintInvoiceModal` and `PrintCreditNoteModal` each
 * carried a byte-identical private copy of these two functions; this is that code, moved
 * once so invoices, credit notes and kitchen tickets behave the same way rather than
 * drifting apart.
 */

/** Saves the document instead of opening it. Used when a popup blocker wins. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the document in a new tab for the operator to print.
 *
 * Deliberately does **not** call `window.print()`. The thermal invoice has always opened a
 * preview and let the operator choose the printer and the paper — a kitchen ticket that
 * forces a dialog behaves unlike every other document in the app, and on a counter with
 * one browser and two printers it fires at whichever happens to be default.
 *
 * Falls back to a download when a popup blocker refuses the tab, so the document is never
 * silently lost.
 */
export function openPdfPreview(blob: Blob, fallbackName: string): void {
  const url = window.URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    downloadBlob(blob, fallbackName);
  } else {
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}
