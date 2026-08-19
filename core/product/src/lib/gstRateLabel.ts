/** GST % stored on the line (product settings), not inferred from tax ÷ subtotal. */
export function storedGstRateLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().replace(/%/g, '');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(n);
}

export function uniqueGstRateLabel(
  lines: Array<{ sgst?: string | null; cgst?: string | null } | null | undefined>,
  key: 'sgst' | 'cgst',
): string | null {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const line of lines) {
    const label = storedGstRateLabel(line?.[key]);
    if (label == null || seen.has(label)) continue;
    seen.add(label);
    ordered.push(label);
  }
  return ordered.length === 0 ? null : ordered.join('/');
}

export function gstAmountRowLabel(kind: 'SGST' | 'CGST', rate: string | null): string {
  return rate ? `${kind} (${rate}%)` : kind;
}
