import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BRIDGE_ORIGIN,
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

describe('printBridge', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('returns null when the health probe times out', async () => {
    const abort = new Error('The operation was aborted.');
    abort.name = 'AbortError';
    fetchMock.mockRejectedValue(abort);

    await expect(isBridgeUp()).resolves.toBeNull();
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
});
