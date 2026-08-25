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
 *   before headers arrived) is UNREACHABLE: the bridge was never reached.
 * - A settled response with a non-2xx status is REJECTED, carrying
 *   `response.status`: the bridge was reached and explicitly refused.
 * - A settled 2xx response whose body read is later aborted by the timeout
 *   is also UNREACHABLE: headers said OK, but we never got confirmation the
 *   job was accepted, so callers should treat it the same as never having
 *   reached the bridge and fall back to a file download rather than assume
 *   a stalled connection printed.
 * - A settled 2xx response with a body that fails to parse (but was not
 *   aborted) is REJECTED, carrying `response.status`: the bridge was
 *   definitely reached and definitely answered, just with content we can't
 *   use.
 *
 * @throws PrintBridgeError with kind UNREACHABLE when the bridge cannot be contacted,
 *     or kind REJECTED (carrying the HTTP status) when the bridge refuses the job.
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
      if (err instanceof PrintBridgeError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new PrintBridgeError(
          'Print bridge stopped responding while confirming the job',
          'UNREACHABLE',
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
