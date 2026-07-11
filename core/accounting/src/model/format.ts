/** Money formatting helpers for the accounting UI. */
export function formatMoney(value: number | undefined | null): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Returns "—" for zero/empty values; the formatted money otherwise. */
export function formatMoneyOrDash(value: number | undefined | null): string {
  if (value == null || value === 0) return '—';
  return formatMoney(value);
}

/** {@code "yyyy-mm-dd"} string from server is left as-is for display. */
export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return date;
}

/** Short human date for dense tables (e.g. 11 Jul 2026). */
export function formatDateShort(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const JOURNAL_SOURCE_LABELS: Record<string, string> = {
  VENDOR_PURCHASE_INVOICE: 'Vendor purchase',
  VENDOR_PURCHASE_RETURN: 'Vendor return',
  SALE: 'Sale',
  SALES_RETURN: 'Sales return',
  CUSTOMER_SETTLEMENT: 'Customer settlement',
  VENDOR_PAYMENT: 'Vendor payment',
  INVENTORY_CORRECTION: 'Stock correction',
  MANUAL: 'Manual',
  REVERSAL: 'Reversal',
  OPENING_BALANCE: 'Opening balance',
};

export function formatJournalSource(source?: string | null): string {
  if (!source) return '—';
  return JOURNAL_SOURCE_LABELS[source] ?? source.replace(/_/g, ' ').toLowerCase();
}

export function formatJournalStatus(status?: string | null): string {
  if (!status) return '—';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatPartyLabel(partyType?: string | null): string {
  if (!partyType) return '';
  const labels: Record<string, string> = {
    VENDOR: 'Vendor',
    CUSTOMER: 'Customer',
    SHOP: 'Shop',
  };
  return labels[partyType] ?? partyType.charAt(0) + partyType.slice(1).toLowerCase();
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Today's date in the user's local timezone as {@code "yyyy-mm-dd"}.
 *
 * <p>{@code new Date().toISOString().slice(0, 10)} returns the UTC date, which is off-by-one for
 * users east of UTC late in their evening — e.g. 2 AM IST is still "yesterday" in UTC. The trial
 * balance and other "as of today" defaults need the user's local calendar date so a JE posted
 * today (stored at midnight UTC of the local date) isn't filtered out.
 */
export function todayLocalDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
