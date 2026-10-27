import type { CartResponse, SaleLineTax } from '../model/types';

/**
 * Per-line taxable value and GST keyed by inventory id, read from the server's tax summary
 * (`taxSummary.lines`, in the same order as `items`). Never recomputed on the client: the figures
 * shown while billing must be the ones the printed invoice will state (STK-293). Empty when the
 * bill carries no tax or the API predates per-line figures, and the screen then shows nothing.
 */
export function buildCartLineTaxIndex(cartData: CartResponse | null): Map<string, SaleLineTax> {
  const index = new Map<string, SaleLineTax>();
  const lines = cartData?.taxSummary?.lines;
  if (!lines) return index;
  (cartData?.items ?? []).forEach((item, idx) => {
    const line = lines[idx];
    if (item.inventoryId && line) index.set(item.inventoryId, line);
  });
  return index;
}

/** 5 → "5", 12.5 → "12.5", 0.25 → "0.25": a GST rate without trailing zeros. */
export function formatGstRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : String(Number(rate.toFixed(3)));
}
