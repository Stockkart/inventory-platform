import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError } from './ApiError';
import { toBlobRequestError } from './blobError';

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, statusText: '', data, headers: {}, config } as AxiosResponse;
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    config,
    {},
    response,
  );
}

const jsonBlob = (body: unknown) => new Blob([JSON.stringify(body)], { type: 'application/json' });

describe('toBlobRequestError', () => {
  it('shows the server busy message instead of "status code 503"', async () => {
    const busy = 'Another report is being prepared. Please try again in a minute.';
    const result = await toBlobRequestError(
      httpError(503, jsonBlob({ success: false, error: busy, data: { message: busy } })),
    );

    expect(result).toBeInstanceOf(ApiError);
    expect((result as ApiError).message).toBe(busy);
    expect((result as ApiError).status).toBe(503);
  });

  it('prefers data.message, then error, then message, like the shared client', async () => {
    const pick = async (body: unknown) =>
      ((await toBlobRequestError(httpError(400, jsonBlob(body)))) as Error).message;

    expect(await pick({ data: { message: 'a' }, error: 'b', message: 'c' })).toBe('a');
    expect(await pick({ error: 'b', message: 'c' })).toBe('b');
    expect(await pick({ message: 'c' })).toBe('c');
  });

  it('reads plain object and string bodies too', async () => {
    expect(((await toBlobRequestError(httpError(403, { error: 'x' }))) as Error).message).toBe('x');
    expect(((await toBlobRequestError(httpError(403, '{"error":"y"}'))) as Error).message).toBe(
      'y',
    );
  });

  it('returns the original error when the body is not JSON or has no message', async () => {
    const notJson = httpError(502, new Blob(['<html>Bad gateway</html>']));
    const empty = httpError(500, jsonBlob({ success: false }));

    expect(await toBlobRequestError(notJson)).toBe(notJson);
    expect(await toBlobRequestError(empty)).toBe(empty);
  });

  it('returns non-HTTP errors unchanged', async () => {
    const plain = new Error('boom');
    const network = new AxiosError('Network Error', 'ERR_NETWORK');

    expect(await toBlobRequestError(plain)).toBe(plain);
    expect(await toBlobRequestError(network)).toBe(network);
  });
});
