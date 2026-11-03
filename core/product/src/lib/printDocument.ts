/**
 * How a printed document leaves the browser: a file saved to disk, or a PDF opened in a tab.
 * `PrintInvoiceModal` and `PrintCreditNoteModal` each carried a private copy of these; this is
 * that code, once.
 */

/** Saves the document instead of opening it. Used for printer files and when a popup blocker wins. */
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

/** Saves a printer file the backend rendered (`PrintDownload`). */
export function downloadPrinterFile(file: { filename: string; content: string }): void {
  downloadBlob(new Blob([file.content], { type: 'application/octet-stream' }), file.filename);
}

/**
 * Opens the document in a new tab for the operator to print. Falls back to a download when a
 * popup blocker refuses the tab, so the document is never silently lost.
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
