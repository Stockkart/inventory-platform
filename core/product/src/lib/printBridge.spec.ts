import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BRIDGE_HEALTH_TIMEOUT_MS,
  BRIDGE_ORIGIN,
  BRIDGE_PRINT_TIMEOUT_MS,
  PrintBridgeError,
  isBridgeUp,
  sendToBridge,
  type PrintJobRequest,
} from './printBridge';

const HEALTH = {
  name: 'stockkart-print-bridge',
  version: '1.0.0',
  printers: ['Epson LX-310'],
  selectedPrinter: 'Epson LX-310',
  ready: true,
};

const JOB: PrintJobRequest = {
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

  it('keeps the print timeout armed through the body read, aborting a stalled 2xx response as UNREACHABLE', async () => {
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
    expect(error.kind).toBe('UNREACHABLE');
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
