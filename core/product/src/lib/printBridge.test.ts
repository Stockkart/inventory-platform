import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BRIDGE_HEALTH_TIMEOUT_MS,
  BRIDGE_ORIGIN,
  BRIDGE_PRINT_TIMEOUT_MS,
  PrintBridgeError,
  getJobs,
  isBridgeUp,
  observeBridge,
  observeSendFailure,
  pollJobOutcome,
  sendToBridge,
  type BridgeJob,
} from './printBridge';

const HEALTH = {
  name: 'stockkart-print-bridge',
  version: '1.0.0',
  printers: ['Epson LX-310'],
  selectedPrinter: 'Epson LX-310',
  ready: true,
};

/** The backend's `bridgeRequest`; sent unchanged and never read by the client. */
const JOB = {
  docType: 'INVOICE',
  docId: 'purchase-1',
  copies: 1,
  text: 'INVOICE TEXT\n',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fetch mock whose returned promise only ever settles when the request's
 * AbortSignal fires - it never resolves or rejects on its own. Used to prove
 * a timeout genuinely aborts an in-flight call, rather than merely being
 * simulated by pre-rejecting the mock. */
function hangUntilAborted(): (url: string, init: RequestInit) => Promise<never> {
  return (_url: string, init: RequestInit) =>
    new Promise<never>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        const abortError = new Error('The operation was aborted.');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });
}

describe('printBridge', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports health when the bridge answers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, HEALTH));

    await expect(isBridgeUp()).resolves.toEqual(HEALTH);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BRIDGE_ORIGIN}/health`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns null when the bridge is not running', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(isBridgeUp()).resolves.toBeNull();
  });

  it('aborts the health probe once the timeout elapses, and resolves null', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(hangUntilAborted());

    const result = isBridgeUp(BRIDGE_HEALTH_TIMEOUT_MS);
    // Nothing has settled yet: the mock never resolves on its own.
    await vi.advanceTimersByTimeAsync(BRIDGE_HEALTH_TIMEOUT_MS);

    await expect(result).resolves.toBeNull();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.signal as AbortSignal).aborted).toBe(true);
  });

  it('returns null when the bridge answers with a non-200', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));

    await expect(isBridgeUp()).resolves.toBeNull();
  });

  it('posts the job and returns the job id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { jobId: 'j-7' }));

    await expect(sendToBridge(JOB)).resolves.toEqual({ jobId: 'j-7' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BRIDGE_ORIGIN}/print`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(JOB);
  });

  it('throws a REJECTED error carrying the status and server message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'duplicate job suppressed' }));

    await expect(sendToBridge(JOB)).rejects.toMatchObject({
      name: 'PrintBridgeError',
      kind: 'REJECTED',
      status: 409,
      message: 'duplicate job suppressed',
    });
  });

  it('throws an UNREACHABLE error when the bridge is not running', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await sendToBridge(JOB).catch((e) => e);
    expect(error).toBeInstanceOf(PrintBridgeError);
    expect(error.kind).toBe('UNREACHABLE');
    expect(error.status).toBeUndefined();
  });

  it('keeps the print timeout armed through the body read, rejecting a stalled 2xx response as REJECTED (not UNREACHABLE)', async () => {
    vi.useFakeTimers();
    const bodyRead = hangUntilAborted();
    fetchMock.mockImplementation(
      (url: string, init: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 202,
          json: () => bodyRead(url, init),
        }) as unknown as Promise<Response>,
    );

    // Attach the rejection handler synchronously, before advancing timers -
    // the reject can happen inside advanceTimersByTimeAsync itself, and a
    // handler attached afterwards would be too late to suppress the
    // "unhandled rejection" that Node/Vitest would otherwise report.
    const result = sendToBridge(JOB, BRIDGE_PRINT_TIMEOUT_MS).catch((e) => e);
    // Headers "arrived" (the mock's outer promise already resolved), but the
    // body read never settles on its own - only the timeout can end this.
    await vi.advanceTimersByTimeAsync(BRIDGE_PRINT_TIMEOUT_MS);

    const error = await result;
    expect(error).toBeInstanceOf(PrintBridgeError);
    // Headers already said 202 (queued): a stall while confirming the body
    // does not mean the bridge was never reached, so callers must not get
    // UNREACHABLE here - that would trigger a file-download fallback that
    // risks printing the invoice a second time. REJECTED, with the real
    // status and a message that says the job may already have printed, is
    // what stops a caller from reflexively reprinting.
    expect(error.kind).toBe('REJECTED');
    expect(error.status).toBe(202);
    expect(error.message).toMatch(/already have printed/i);
  });

  it('wraps a malformed 2xx response body as a REJECTED PrintBridgeError, not a raw parse error', async () => {
    fetchMock.mockResolvedValue(
      new Response('not json', { status: 202, headers: { 'content-type': 'application/json' } }),
    );

    const error = await sendToBridge(JOB).catch((e) => e);
    expect(error).toBeInstanceOf(PrintBridgeError);
    expect(error).not.toBeInstanceOf(SyntaxError);
    expect(error.kind).toBe('REJECTED');
    expect(error.status).toBe(202);
  });
});

function job(overrides: Partial<BridgeJob> = {}): BridgeJob {
  return {
    id: 'j-7',
    docType: 'INVOICE',
    docId: 'purchase-1',
    copies: 1,
    status: 'QUEUED',
    error: null,
    at: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function jobsResponse(jobs: BridgeJob[]): Response {
  return jsonResponse(200, { jobs });
}

describe('getJobs', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the job list when the bridge answers', async () => {
    const jobs = [job({ status: 'PRINTED' })];
    fetchMock.mockResolvedValue(jobsResponse(jobs));

    await expect(getJobs()).resolves.toEqual(jobs);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BRIDGE_ORIGIN}/jobs`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns an empty list when the bridge answers with a non-200, never throwing', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));

    await expect(getJobs()).resolves.toEqual([]);
  });

  it('returns an empty list when the bridge is unreachable, never throwing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getJobs()).resolves.toEqual([]);
  });

  it('returns an empty list when the body has no jobs array', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await expect(getJobs()).resolves.toEqual([]);
  });
});

describe('pollJobOutcome', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resolves PRINTED as soon as the bridge reports it, on the very first check', async () => {
    fetchMock.mockResolvedValue(jobsResponse([job({ status: 'PRINTED' })]));

    await expect(pollJobOutcome('j-7', { budgetMs: 2000, intervalMs: 200 })).resolves.toEqual({
      observation: 'PRINTED',
      error: null,
    });
  });

  it("resolves FAILED carrying the bridge's own error text", async () => {
    fetchMock.mockResolvedValue(
      jobsResponse([job({ status: 'FAILED', error: 'winspool: printer offline' })]),
    );

    await expect(pollJobOutcome('j-7', { budgetMs: 2000, intervalMs: 200 })).resolves.toEqual({
      observation: 'FAILED',
      error: 'winspool: printer offline',
    });
  });

  it('reports FAILED with no error text as null, leaving the wording to the caller', async () => {
    fetchMock.mockResolvedValue(jobsResponse([job({ status: 'FAILED', error: null })]));

    await expect(pollJobOutcome('j-7', { budgetMs: 2000, intervalMs: 200 })).resolves.toEqual({
      observation: 'FAILED',
      error: null,
    });
  });

  it('keeps polling while QUEUED and resolves PRINTED once the bridge catches up', async () => {
    let calls = 0;
    fetchMock.mockImplementation(() => {
      calls += 1;
      const status = calls < 3 ? 'QUEUED' : 'PRINTED';
      return Promise.resolve(jobsResponse([job({ status })]));
    });

    const result = pollJobOutcome('j-7', { budgetMs: 2000, intervalMs: 200 });
    await vi.advanceTimersByTimeAsync(2000);

    await expect(result).resolves.toEqual({ observation: 'PRINTED', error: null });
    // First check plus two more before the third (successful) check.
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('resolves STILL_QUEUED - never rounded up to PRINTED or down to FAILED - once the budget runs out', async () => {
    // A fresh Response per call: fetch Responses can only have their body
    // read once, and this poll calls GET /jobs repeatedly.
    fetchMock.mockImplementation(() => Promise.resolve(jobsResponse([job({ status: 'QUEUED' })])));

    const result = pollJobOutcome('j-7', { budgetMs: 1000, intervalMs: 200 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toEqual({ observation: 'STILL_QUEUED', error: null });
  });

  it('resolves STILL_QUEUED, not an error, when the job never appears in the history', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jobsResponse([])));

    const result = pollJobOutcome('j-7', { budgetMs: 1000, intervalMs: 200 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toEqual({ observation: 'STILL_QUEUED', error: null });
  });

  it('resolves STILL_QUEUED rather than throwing when every GET /jobs call fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = pollJobOutcome('j-7', { budgetMs: 1000, intervalMs: 200 });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toEqual({ observation: 'STILL_QUEUED', error: null });
  });
});

describe('observeBridge', () => {
  it('reports a reachable bridge with its version and printer', () => {
    expect(observeBridge(HEALTH)).toEqual({
      reachable: true,
      version: '1.0.0',
      selectedPrinter: 'Epson LX-310',
    });
  });

  it('reports no bridge as unreachable with nothing else', () => {
    expect(observeBridge(null)).toEqual({ reachable: false, version: null, selectedPrinter: null });
  });
});

describe('observeSendFailure', () => {
  it('reports a bridge that was never reached as UNREACHABLE', () => {
    expect(
      observeSendFailure(new PrintBridgeError('Print bridge is not running', 'UNREACHABLE')),
    ).toEqual({ observation: 'UNREACHABLE', error: null });
  });

  it('reports a 409 as DUPLICATE, not as a refusal', () => {
    expect(
      observeSendFailure(new PrintBridgeError('duplicate job suppressed', 'REJECTED', 409)),
    ).toEqual({ observation: 'DUPLICATE', error: null });
  });

  it("reports any other refusal as REJECTED with the bridge's message", () => {
    expect(observeSendFailure(new PrintBridgeError('bad request', 'REJECTED', 400))).toEqual({
      observation: 'REJECTED',
      error: 'bad request',
    });
  });

  it('reports an unexpected error as REJECTED, since the bridge may have been reached', () => {
    expect(observeSendFailure(new Error('boom'))).toEqual({
      observation: 'REJECTED',
      error: 'boom',
    });
  });
});
