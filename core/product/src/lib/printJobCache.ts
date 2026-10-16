/**
 * The dot matrix jobs this browser has sent and not yet seen finish, kept in `localStorage` so
 * every tab on the shop PC sees them and a reload does not lose them.
 *
 * Storage only: what an entry means is the backend's call. Its age goes to `POST /print-jobs`
 * as `pendingAgeMs` (the backend answers IN_PROGRESS within its in-flight time), and an entry
 * the bridge later shows finished, or that outlives `expiresAt`, is reported to
 * `POST /print-jobs/outcome`. The in-flight time itself comes from the backend
 * (`PrintJobPlan.inFlightTtlMs`); nothing here picks a duration.
 *
 * Keyed per shop, so two shops on one PC never block each other. `localStorage` throws in
 * private mode and sandboxed frames; every access here fails soft to "no entries", which only
 * loses duplicate protection - the bridge's own 409 still stands behind it.
 */
import type { PrintDocumentKind, PrintDocumentSource } from '@inventory-platform/product/types';

/** Bump when the entry shape changes, so old entries are ignored rather than misread. */
const KEY_PREFIX = 'sk.printJobs.v1.';

/** The api-client's own key for the active shop. */
const SHOP_ID_KEY = 'x_shop_id';

export interface CachedPrintJob {
  source: PrintDocumentSource;
  documentId: string;
  documentKind: PrintDocumentKind;
  documentNumber: string | null;
  /** The bridge's job id; null while the job is still being sent. */
  bridgeJobId: string | null;
  /** When it was sent, epoch ms. */
  sentAt: number;
  /** Until when the tab that sent it is still polling it; a later check leaves it alone before. */
  watchUntil: number;
  /** `sentAt` plus the backend's in-flight time. */
  expiresAt: number;
}

function storageKey(): string | null {
  try {
    const shopId = localStorage.getItem(SHOP_ID_KEY);
    return shopId ? `${KEY_PREFIX}${shopId}` : null;
  } catch {
    return null;
  }
}

function isEntry(value: unknown): value is CachedPrintJob {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<CachedPrintJob>;
  return (
    typeof entry.source === 'string' &&
    typeof entry.documentId === 'string' &&
    typeof entry.documentKind === 'string' &&
    typeof entry.sentAt === 'number' &&
    typeof entry.watchUntil === 'number' &&
    typeof entry.expiresAt === 'number'
  );
}

function sameDocument(a: CachedPrintJob, source: PrintDocumentSource, documentId: string): boolean {
  return a.source === source && a.documentId === documentId;
}

/** Every entry for the active shop, expired ones included: those still have to be reported. */
export function listCachedPrintJobs(): CachedPrintJob[] {
  const key = storageKey();
  if (!key) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: CachedPrintJob[]): void {
  const key = storageKey();
  if (!key) {
    return;
  }
  try {
    if (entries.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(entries));
    }
  } catch {
    // Storage unavailable: duplicate protection falls back to the bridge's own 409.
  }
}

/** The entry for this document that has not expired yet, if any. */
export function findPendingPrintJob(
  source: PrintDocumentSource,
  documentId: string,
  now: number,
): CachedPrintJob | null {
  return (
    listCachedPrintJobs().find(
      (entry) => sameDocument(entry, source, documentId) && entry.expiresAt > now,
    ) ?? null
  );
}

/** Add or replace the entry for a document. */
export function putCachedPrintJob(job: CachedPrintJob): void {
  const others = listCachedPrintJobs().filter(
    (entry) => !sameDocument(entry, job.source, job.documentId),
  );
  writeAll([...others, job]);
}

export function removeCachedPrintJob(source: PrintDocumentSource, documentId: string): void {
  const entries = listCachedPrintJobs();
  const kept = entries.filter((entry) => !sameDocument(entry, source, documentId));
  if (kept.length !== entries.length) {
    writeAll(kept);
  }
}
