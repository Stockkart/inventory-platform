/**
 * Transport to the StockKart dot matrix print bridge, a small local application that
 * listens on loopback and writes raw ESC/P bytes to a locally attached printer.
 *
 * This file carries and observes; it decides nothing. The backend (`POST /print-jobs`)
 * decides whether a document goes to the bridge, what the bridge is sent and what any
 * result means. Here: probe the bridge, send the backend's payload unchanged, watch the
 * bridge's job history, and say what was seen.
 *
 * This file uses raw `fetch` on purpose. The bridge is a loopback app, not the StockKart
 * API, so `apiClient` (base URL, auth and shop headers) would be wrong here. See the
 * package README, "Dot matrix printing".
 */
import type { PrintBridgeObservation, PrintObservation } from '@inventory-platform/product/types';

/** Loopback origin the bridge listens on. Never a LAN address. */
export const BRIDGE_ORIGIN = 'http://127.0.0.1:9110';

/** Health probes must not stall the billing screen. */
export const BRIDGE_HEALTH_TIMEOUT_MS = 1200;

/** Printing is a local socket write; generous but still bounded. */
export const BRIDGE_PRINT_TIMEOUT_MS = 8000;

export interface BridgeHealth {
  name: string;
  version: string;
  printers: string[];
  selectedPrinter: string | null;
  ready: boolean;
}

export interface PrintJobAccepted {
  jobId: string;
}

/**
 * UNREACHABLE means the bridge is not installed, not running, or was blocked by the
 * browser. REJECTED means the bridge answered and refused the job.
 */
export class PrintBridgeError extends Error {
  readonly kind: 'UNREACHABLE' | 'REJECTED';
  readonly status?: number;

  constructor(message: string, kind: 'UNREACHABLE' | 'REJECTED', status?: number) {
    super(message);
    this.name = 'PrintBridgeError';
    this.kind = kind;
    this.status = status;
  }
}

function withTimeout(timeoutMs: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body && typeof body.error === 'string' && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // Non-JSON body; fall through to the generic message.
  }
  return `Print bridge refused the job (HTTP ${response.status})`;
}

/**
 * Probe the bridge. Resolves to its health, or null when it is unreachable for any
 * reason. Never throws, so callers can use it as a plain feature check.
 */
export async function isBridgeUp(
  timeoutMs: number = BRIDGE_HEALTH_TIMEOUT_MS,
): Promise<BridgeHealth | null> {
  const { signal, done } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`${BRIDGE_ORIGIN}/health`, { method: 'GET', signal });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as BridgeHealth;
  } catch {
    return null;
  } finally {
    done();
  }
}

/** What a probe saw, in the shape the backend reads. */
export function observeBridge(health: BridgeHealth | null): PrintBridgeObservation {
  return health
    ? { reachable: true, version: health.version ?? null, selectedPrinter: health.selectedPrinter }
    : { reachable: false, version: null, selectedPrinter: null };
}

/**
 * Send the backend's `bridgeRequest` to the bridge, unchanged and unread.
 *
 * The timeout stays armed for the full call, including the body read after
 * headers arrive: a bridge that answers 202 and then stalls mid-body must
 * still be aborted, not left hanging forever.
 *
 * Classification of failures, by design:
 * - `fetch()` itself never settling (no connection, refused, or aborted
 *   before headers arrived) is UNREACHABLE: the bridge was never reached at
 *   all, so nothing was printed.
 * - Everything else - a settled response with a non-2xx status, a settled
 *   2xx response whose body fails to parse, or a settled 2xx response whose
 *   body read is later aborted by the timeout - is REJECTED, carrying
 *   `response.status`: the bridge was reached and did answer, so the job may
 *   already have reached the printer.
 *
 * @throws PrintBridgeError with kind UNREACHABLE only when the bridge could not be
 *     contacted at all, or kind REJECTED (carrying the HTTP status) for every case
 *     where the bridge was reached but the job could not be confirmed accepted.
 *     Never throws anything else, including a raw parse error.
 */
export async function sendToBridge(
  payload: unknown,
  timeoutMs: number = BRIDGE_PRINT_TIMEOUT_MS,
): Promise<PrintJobAccepted> {
  const { signal, done } = withTimeout(timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${BRIDGE_ORIGIN}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });
    } catch {
      throw new PrintBridgeError('Print bridge is not running on this computer', 'UNREACHABLE');
    }

    if (!response.ok) {
      throw new PrintBridgeError(await readError(response), 'REJECTED', response.status);
    }

    try {
      return (await response.json()) as PrintJobAccepted;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new PrintBridgeError(
          'Print bridge stopped responding while confirming the job; it may already have printed.',
          'REJECTED',
          response.status,
        );
      }
      throw new PrintBridgeError(
        'Print bridge returned an unreadable response',
        'REJECTED',
        response.status,
      );
    }
  } finally {
    done();
  }
}

/**
 * What a failed send looked like, for the backend to judge. A 409 is the bridge
 * suppressing a duplicate of a job it already has in flight.
 */
export function observeSendFailure(error: unknown): {
  observation: PrintObservation;
  error: string | null;
} {
  if (error instanceof PrintBridgeError) {
    if (error.kind === 'UNREACHABLE') {
      return { observation: 'UNREACHABLE', error: null };
    }
    if (error.status === 409) {
      return { observation: 'DUPLICATE', error: null };
    }
    return { observation: 'REJECTED', error: error.message };
  }
  return {
    observation: 'REJECTED',
    error: error instanceof Error ? error.message : 'Print bridge request failed',
  };
}

/**
 * `POST /print` answers `202` as soon as the job is queued, before it has
 * actually reached the printer - the bridge prints in a background goroutine
 * and records the terminal state (`PRINTED` / `FAILED`) in its own job
 * history, in memory only. Polling it is the only way to see a printer that
 * is off, out of paper or jammed.
 */
export type BridgeJobStatus = 'QUEUED' | 'PRINTED' | 'FAILED';

export interface BridgeJob {
  id: string;
  docType: string;
  docId: string;
  copies: number;
  status: BridgeJobStatus;
  error: string | null;
  at: string;
}

/**
 * Fetch the bridge's recent job history. Like {@link isBridgeUp}, this never
 * throws - any failure (network, timeout, malformed body) resolves to an
 * empty list, so a poll loop can simply try again on the next interval.
 */
export async function getJobs(timeoutMs: number = BRIDGE_HEALTH_TIMEOUT_MS): Promise<BridgeJob[]> {
  const { signal, done } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`${BRIDGE_ORIGIN}/jobs`, { method: 'GET', signal });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as { jobs?: BridgeJob[] };
    return Array.isArray(body.jobs) ? body.jobs : [];
  } catch {
    return [];
  } finally {
    done();
  }
}

/** What polling saw: the bridge's own terminal state, or that it was still queued. */
export interface PolledJob {
  observation: Extract<PrintObservation, 'PRINTED' | 'FAILED' | 'STILL_QUEUED'>;
  error: string | null;
}

/**
 * Poll `GET /jobs` for one job's terminal state for up to `budgetMs`, every
 * `intervalMs` (both from the backend's print job). Resolves as soon as the
 * bridge reports `PRINTED` or `FAILED`; resolves `STILL_QUEUED` once the
 * budget is spent without seeing either. Never throws - a bridge that stops
 * answering mid-poll runs out the budget, which is the honest answer.
 */
export async function pollJobOutcome(
  jobId: string,
  options: { budgetMs: number; intervalMs: number },
): Promise<PolledJob> {
  const deadline = Date.now() + options.budgetMs;

  const checkOnce = async (): Promise<PolledJob | null> => {
    const jobs = await getJobs();
    const job = jobs.find((candidate) => candidate.id === jobId);
    if (!job) {
      return null;
    }
    if (job.status === 'PRINTED') {
      return { observation: 'PRINTED', error: null };
    }
    if (job.status === 'FAILED') {
      return { observation: 'FAILED', error: job.error && job.error.length > 0 ? job.error : null };
    }
    return null; // still QUEUED, or not yet visible in the history
  };

  const first = await checkOnce();
  if (first) {
    return first;
  }

  while (Date.now() < deadline) {
    await sleep(Math.min(options.intervalMs, Math.max(0, deadline - Date.now())));
    const result = await checkOnce();
    if (result) {
      return result;
    }
  }
  return { observation: 'STILL_QUEUED', error: null };
}
