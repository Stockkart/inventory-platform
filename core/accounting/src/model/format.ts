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

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
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
