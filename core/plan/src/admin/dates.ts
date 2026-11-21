/**
 * Admin forms pick calendar days; the API stores instants. Days are Indian Standard Time, the
 * same zone the server uses for campaigns and reports.
 */
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = 330 * 60_000;

/** 00:00:00 IST on `day` (YYYY-MM-DD). */
export function startOfDayIst(day: string): string {
  return new Date(`${day}T00:00:00${IST_OFFSET}`).toISOString();
}

/** 23:59:59 IST on `day`, so the whole day counts. */
export function endOfDayIst(day: string): string {
  return new Date(`${day}T23:59:59${IST_OFFSET}`).toISOString();
}

/** The IST calendar day of an instant, for prefilling a date input. */
export function istDay(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DDTHH:mm` in IST, for a datetime-local input. */
export function istDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** A datetime-local value read as IST. */
export function fromIstDateTime(value: string): string {
  return new Date(`${value}:00${IST_OFFSET}`).toISOString();
}
