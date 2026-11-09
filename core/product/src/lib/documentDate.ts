/**
 * Dates on a trade document, formatted as the document states them.
 *
 * An invoice date is a calendar date, not a moment: the bill says 31 Aug 2026 and carries no
 * clock. The API returns it as an instant, and the store holds three different conventions for
 * the time half — midnight UTC, noon UTC, and 23:59 IST — so rendering one with a time attached
 * prints whatever that convention happens to be. Midnight UTC reads as `5:30 am` in India, on
 * 380 of the 729 purchase invoices recorded so far.
 *
 * The zone is pinned rather than taken from the browser. A GST document date is an Indian
 * calendar date; read in a zone west of UTC, a midnight-UTC value renders as the day before,
 * which would put a bill in the wrong return period on screen.
 */
const DOCUMENT_TIME_ZONE = 'Asia/Kolkata';

/** A document's own date — no clock, since the paper carries none. */
export function formatDocumentDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    timeZone: DOCUMENT_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * When a record was written, clock included.
 *
 * For `createdAt` and friends the time is real and worth showing. Migrated rows carry midnight
 * and will read `12:00 am`; that is the recorded value, not a formatting artefact.
 */
export function formatRecordedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    timeZone: DOCUMENT_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
