/**
 * Client for the StockKart dot matrix print bridge, a small local application that
 * listens on loopback and writes raw ESC/P bytes to a locally attached printer.
 *
 * The bridge is optional. Every failure path here is recoverable: callers fall back to
 * downloading the print file so billing is never blocked by a missing bridge.
 */

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

export type PrintDocType = 'INVOICE';

export interface PrintJobRequest {
  docType: PrintDocType;
  docId: string;
  copies: number;
  text: string;
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

/**
 * Send a rendered document to the bridge for printing.
 *
 * The timeout stays armed for the full call, including the body read after
 * headers arrive: a bridge that answers 202 and then stalls mid-body must
 * still be aborted, not left hanging forever.
 *
 * Classification of failures, by design:
 * - `fetch()` itself never settling (no connection, refused, or aborted
 *   before headers arrived) is UNREACHABLE: the bridge was never reached at
 *   all, so a caller's file-download fallback is honest - nothing was
 *   printed.
 * - Everything else - a settled response with a non-2xx status, a settled
 *   2xx response whose body fails to parse, or a settled 2xx response whose
 *   body read is later aborted by the timeout - is REJECTED, carrying
 *   `response.status`: the bridge was reached and did answer. Under this
 *   wire contract a 202 means the job was queued, not that printing
 *   finished, so a timeout while confirming the body very likely means the
 *   job already reached the printer. Treating that as UNREACHABLE would
 *   make a caller's fallback silently produce a second physical invoice;
 *   REJECTED surfaces an actionable error instead.
 *
 * @throws PrintBridgeError with kind UNREACHABLE only when the bridge could not be
 *     contacted at all, or kind REJECTED (carrying the HTTP status) for every case
 *     where the bridge was reached but the job could not be confirmed accepted.
 *     Never throws anything else, including a raw parse error.
 */
export async function sendToBridge(
  job: PrintJobRequest,
  timeoutMs: number = BRIDGE_PRINT_TIMEOUT_MS,
): Promise<PrintJobAccepted> {
  const { signal, done } = withTimeout(timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${BRIDGE_ORIGIN}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
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
 * `POST /print` answers `202` as soon as the job is queued, before it has
 * actually reached the printer - the bridge prints in a background
 * goroutine and records the terminal state (`PRINTED` / `FAILED`) in its own
 * job history, in memory only. Nothing else in StockKart ever looks at that
 * history unless a caller polls it, so a printer that is off, out of paper,
 * jammed, or renamed would otherwise fail silently: the modal would already
 * be closed, and the operator would move on believing the invoice printed.
 */
export type PrintJobStatus = 'QUEUED' | 'PRINTED' | 'FAILED';

export interface PrintJob {
  id: string;
  docType: PrintDocType;
  docId: string;
  copies: number;
  status: PrintJobStatus;
  error: string | null;
  at: string;
}

/** Default poll budget: roughly 5 seconds, per design spec finding on silent print failures. */
export const JOB_POLL_BUDGET_MS = 5000;

/** How often to re-check `GET /jobs` while a job is still `QUEUED`. */
export const JOB_POLL_INTERVAL_MS = 500;

/**
 * Fetch the bridge's recent job history. Like {@link isBridgeUp}, this never
 * throws - any failure (network, timeout, malformed body) resolves to an
 * empty list, so a poll loop can simply try again on the next interval
 * rather than crash the caller.
 */
export async function getJobs(timeoutMs: number = BRIDGE_HEALTH_TIMEOUT_MS): Promise<PrintJob[]> {
  const { signal, done } = withTimeout(timeoutMs);
  try {
    const response = await fetch(`${BRIDGE_ORIGIN}/jobs`, { method: 'GET', signal });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as { jobs?: PrintJob[] };
    return Array.isArray(body.jobs) ? body.jobs : [];
  } catch {
    return [];
  } finally {
    done();
  }
}

/**
 * The honest, terminal-or-not outcome of a print job, once polling stops.
 * `STILL_QUEUED` is a real, distinct outcome - not a stand-in for success or
 * failure - because rounding it either way would be a lie: rounding up
 * claims a legally-required document printed when it may not have; rounding
 * down invites the operator to reprint a job that is about to complete,
 * producing a second physical invoice.
 */
export type PrintJobOutcome =
  | { status: 'PRINTED' }
  | { status: 'FAILED'; error: string }
  | { status: 'STILL_QUEUED' };

/**
 * Poll `GET /jobs` for one job's terminal state for up to `budgetMs`
 * (default {@link JOB_POLL_BUDGET_MS}, ~5s). Resolves as soon as the bridge
 * reports `PRINTED` or `FAILED`; resolves `STILL_QUEUED` once the budget is
 * spent without seeing either. Never throws - a bridge that stops answering
 * mid-poll just runs out the budget and resolves `STILL_QUEUED`, which is
 * the honest answer ("we lost track, but it was queued") rather than an
 * error the caller would have to guess how to handle.
 */
export async function pollJobOutcome(
  jobId: string,
  options: { budgetMs?: number; intervalMs?: number } = {},
): Promise<PrintJobOutcome> {
  const budgetMs = options.budgetMs ?? JOB_POLL_BUDGET_MS;
  const intervalMs = options.intervalMs ?? JOB_POLL_INTERVAL_MS;
  const deadline = Date.now() + budgetMs;

  const checkOnce = async (): Promise<PrintJobOutcome | null> => {
    const jobs = await getJobs();
    const job = jobs.find((candidate) => candidate.id === jobId);
    if (!job) {
      return null;
    }
    if (job.status === 'PRINTED') {
      return { status: 'PRINTED' };
    }
    if (job.status === 'FAILED') {
      return {
        status: 'FAILED',
        error: job.error && job.error.length > 0 ? job.error : 'Unknown printer error',
      };
    }
    return null; // still QUEUED, or not yet visible in the history
  };

  const first = await checkOnce();
  if (first) {
    return first;
  }

  while (Date.now() < deadline) {
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
    const result = await checkOnce();
    if (result) {
      return result;
    }
  }
  return { status: 'STILL_QUEUED' };
}

/** Exact wording required by the design spec (§4.2 step 3). */
export const PRINTED_MESSAGE = 'Sent to printer';

export type PrintOutcomeChannel = 'success' | 'info' | 'error';

export interface PrintOutcomeReport {
  channel: PrintOutcomeChannel;
  message: string;
  /** Whether the caller should close the print modal after reporting this. */
  shouldClose: boolean;
}

/**
 * Turns a polled {@link PrintJobOutcome} into what the operator should be
 * told, and whether it is safe to close the modal.
 *
 * `FAILED` deliberately does not close the modal: the operator needs the
 * failure - and the bridge's own error text - to stay on screen so they can
 * decide whether to reload paper and retry, rather than have it vanish
 * behind a closed modal that looks identical to success.
 */
export function describePrintOutcome(outcome: PrintJobOutcome): PrintOutcomeReport {
  switch (outcome.status) {
    case 'PRINTED':
      return { channel: 'success', message: PRINTED_MESSAGE, shouldClose: true };
    case 'FAILED':
      return {
        channel: 'error',
        message: `Print failed: ${outcome.error}`,
        shouldClose: false,
      };
    case 'STILL_QUEUED':
      return {
        channel: 'info',
        message:
          'Sent to the printer - still printing. Check the print bridge window if it does not finish shortly.',
        shouldClose: true,
      };
  }
}

/**
 * A `409` from `POST /print` means the bridge suppressed a duplicate of a
 * job it already accepted within the last 10 seconds - the invoice is
 * already on its way to the printer. That is information, not a failure:
 * presenting the bridge's own message ("duplicate job suppressed") in an
 * error toast reads as "printing failed" for an event that actually means
 * "it already printed", and is exactly what pushes an uncertain operator to
 * print a second physical copy.
 *
 * Returns `null` for every other {@link PrintBridgeError}, so callers fall
 * through to their normal error handling.
 */
export function describeDuplicateJob(error: PrintBridgeError): PrintOutcomeReport | null {
  if (error.kind === 'REJECTED' && error.status === 409) {
    return {
      channel: 'info',
      message: 'This invoice was already sent to the printer moments ago.',
      shouldClose: true,
    };
  }
  return null;
}
