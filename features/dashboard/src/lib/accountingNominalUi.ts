/** Matches backend {@code VendorPayableNominalService} GL codes (not shown as raw ids in UI). */

export const VENDOR_PAYABLE_CODE_PREFIX = 'VEN-';

export function isVendorPayableNominalCode(code: string | undefined): boolean {
  return (code ?? '').trim().toUpperCase().startsWith(VENDOR_PAYABLE_CODE_PREFIX);
}

const PAYABLE_NAME_PREFIX = 'Payable · ';

/**
 * Value for the "Code" column: built-in codes as-is; vendor payables → vendor-facing name only
 * (internal id stays in optional {@code title} on the cell).
 */
export function nominalCodeLabelForUi(code: string | undefined, accountName: string | undefined): string {
  const c = (code ?? '').trim();
  if (!isVendorPayableNominalCode(code)) {
    return c;
  }
  const name = (accountName ?? '').trim();
  if (name.startsWith(PAYABLE_NAME_PREFIX)) {
    const rest = name.slice(PAYABLE_NAME_PREFIX.length).trim();
    if (rest) return rest;
  }
  return name || 'Vendor payable';
}
