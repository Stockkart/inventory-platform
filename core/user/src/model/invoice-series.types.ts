/** REGULAR invoice numbering series for a shop (FY-scoped). */
export interface InvoiceSeriesResponse {
  shopId: string;
  prefix: string;
  padLength: number;
  source: 'STOCKKART' | 'MIGRATED' | string;
  currentFy: string;
  nextPreview: string;
  locked: boolean;
  lastCounter: number | null;
}

export interface UpdateInvoiceSeriesDto {
  lastInvoiceNo?: string;
  useStockKartDefault?: boolean;
}

/** Client-side preview of next number from a last-invoice string. */
export function previewNextInvoiceNo(lastInvoiceNo: string): string | null {
  const trimmed = lastInvoiceNo.trim();
  const match = /^(.*?)(\d+)$/.exec(trimmed);
  if (!match) return null;
  const prefix = match[1];
  const digits = match[2];
  try {
    const next = (BigInt(digits) + 1n).toString().padStart(digits.length, '0');
    return prefix + next;
  } catch {
    return null;
  }
}
