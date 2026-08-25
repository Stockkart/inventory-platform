const OPEN_QUOTATION_KEY = 'sk-scan-sell-purchase-id';
const PRODUCT_ENTRY_VENDOR_KEY = 'sk-product-entry-vendor';

export function rememberOpenQuotationId(purchaseId: string | null | undefined): void {
  if (typeof sessionStorage === 'undefined') return;
  const id = purchaseId?.trim();
  if (id) {
    sessionStorage.setItem(OPEN_QUOTATION_KEY, id);
  } else {
    sessionStorage.removeItem(OPEN_QUOTATION_KEY);
  }
}

export function readOpenQuotationId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const id = sessionStorage.getItem(OPEN_QUOTATION_KEY)?.trim();
  return id || null;
}

export function rememberProductEntryVendor(vendor: unknown): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(PRODUCT_ENTRY_VENDOR_KEY, JSON.stringify(vendor));
  } catch {
    sessionStorage.removeItem(PRODUCT_ENTRY_VENDOR_KEY);
  }
}

export function readProductEntryVendor<T>(): T | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(PRODUCT_ENTRY_VENDOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    sessionStorage.removeItem(PRODUCT_ENTRY_VENDOR_KEY);
    return null;
  }
}

export function clearProductEntryVendor(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PRODUCT_ENTRY_VENDOR_KEY);
}
