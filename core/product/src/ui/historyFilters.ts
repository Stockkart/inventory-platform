export type HistoryTab =
  | 'saleHistory'
  | 'purchaseHistory'
  | 'customerReturnHistory'
  | 'vendorReturnHistory';

/** Shared filter state for History tabs (sale, purchase, customer return, supplier return). */
export type HistoryFilters = {
  dateFrom: string;
  dateTo: string;
  invoiceNo: string;
  customer: string;
  vendor: string;
};

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  dateFrom: '',
  dateTo: '',
  invoiceNo: '',
  customer: '',
  vendor: '',
};

export function showCustomerFilter(tab: HistoryTab): boolean {
  return tab === 'saleHistory' || tab === 'customerReturnHistory';
}

export function showVendorFilter(tab: HistoryTab): boolean {
  return tab === 'purchaseHistory' || tab === 'vendorReturnHistory';
}

export function hasActiveHistoryFilters(
  filters: HistoryFilters,
  tab?: HistoryTab
): boolean {
  const base = !!(
    filters.dateFrom ||
    filters.dateTo ||
    filters.invoiceNo.trim()
  );
  if (!tab) {
    return base || !!filters.customer.trim() || !!filters.vendor.trim();
  }
  if (showCustomerFilter(tab)) {
    return base || !!filters.customer.trim();
  }
  if (showVendorFilter(tab)) {
    return base || !!filters.vendor.trim();
  }
  return base;
}

export function isValidRegexPattern(pattern: string): boolean {
  const p = pattern.trim();
  if (!p) return true;
  try {
    // eslint-disable-next-line no-new
    new RegExp(p, 'i');
    return true;
  } catch {
    return false;
  }
}

export function validateHistoryFilters(
  filters: HistoryFilters,
  tab: HistoryTab
): string | null {
  if (filters.invoiceNo.trim() && !isValidRegexPattern(filters.invoiceNo)) {
    return 'Invoice number search is not valid — try a simpler value like INV-001.';
  }
  if (showCustomerFilter(tab) && filters.customer.trim() && !isValidRegexPattern(filters.customer)) {
    return 'Customer search is not valid — try a name or phone number.';
  }
  if (showVendorFilter(tab) && filters.vendor.trim() && !isValidRegexPattern(filters.vendor)) {
    return 'Vendor search is not valid — try part of the vendor name.';
  }
  return null;
}

export function compileRegex(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;
  try {
    return new RegExp(p, 'i');
  } catch {
    return null;
  }
}

/** Case-insensitive regex match against any of the given field values. */
export function matchesRegexField(
  pattern: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const p = pattern.trim();
  if (!p) return true;
  const re = compileRegex(p);
  if (!re) return false;
  return fields.some((f) => re.test(f ?? ''));
}

/** Start of local calendar day (inclusive). */
function startOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** End of local calendar day (inclusive). */
function endOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function isDateInRange(
  iso: string | null | undefined,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (dateFrom && t < startOfDayMs(dateFrom)) return false;
  if (dateTo && t > endOfDayMs(dateTo)) return false;
  return true;
}

/** Regex `q` for vendor purchase invoice list (invoice no. and/or vendor name). */
export function buildVendorInvoiceSearchQuery(
  filters: HistoryFilters
): string | undefined {
  const inv = filters.invoiceNo.trim();
  const ven = filters.vendor.trim();
  if (inv && ven) return `(?:${inv}|${ven})`;
  if (inv) return inv;
  if (ven) return ven;
  return undefined;
}

export function paginateLocal<T>(
  items: T[],
  page: number,
  limit: number
): { slice: T[]; total: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    slice: items.slice(start, start + limit),
    total,
    totalPages,
  };
}

