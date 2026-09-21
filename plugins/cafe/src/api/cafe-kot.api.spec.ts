import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { newKey } from '../lib/punchBasket';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);

describe('cafeKotApi.punch', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
  });

  it('posts to the purchase punch URL with the Idempotency-Key header and no body', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: [] } });
    const { cafeKotApi } = await import('./cafe-kot.api');

    await cafeKotApi.punch('p1', 'key-1');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/cafe/purchases/p1/kots');
    expect(body).toBeUndefined();
    expect(config?.headers?.['Idempotency-Key']).toBe('key-1');
  });

  it('resolves with the created tickets from the response envelope', async () => {
    const tickets = [{ kotId: 'k1' }];
    mockedAxios.post.mockResolvedValue({ data: { data: tickets } });
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.punch('p1', 'key-1')).resolves.toBe(tickets);
  });

  it('rejects rather than resolving empty when the server errors', async () => {
    mockedAxios.post.mockRejectedValue(
      Object.assign(new Error('boom'), { response: { status: 500 } }),
    );
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.punch('p1', 'key-1')).rejects.toThrow('boom');
  });

  it('reuses the same key across a retry of one punch attempt', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: [] } });
    const { cafeKotApi } = await import('./cafe-kot.api');

    const key = newKey();
    await cafeKotApi.punch('p1', key);
    await cafeKotApi.punch('p1', key); // retry of the same attempt

    const first = mockedAxios.post.mock.calls[0][2]?.headers?.['Idempotency-Key'];
    const second = mockedAxios.post.mock.calls[1][2]?.headers?.['Idempotency-Key'];
    expect(first).toBe(key);
    expect(second).toBe(key);
  });

  it('uses a different key for a second, independent punch attempt', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: [] } });
    const { cafeKotApi } = await import('./cafe-kot.api');

    const firstAttemptKey = newKey();
    const secondAttemptKey = newKey();
    expect(firstAttemptKey).not.toBe(secondAttemptKey);

    await cafeKotApi.punch('p1', firstAttemptKey);
    await cafeKotApi.punch('p1', secondAttemptKey);

    const first = mockedAxios.post.mock.calls[0][2]?.headers?.['Idempotency-Key'];
    const second = mockedAxios.post.mock.calls[1][2]?.headers?.['Idempotency-Key'];
    expect(first).not.toBe(second);
  });
});

describe('cafeKotApi.getKotPdf', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
  });

  it('fetches the ticket document as a blob', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    mockedAxios.get.mockResolvedValue({ data: blob });
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.getKotPdf('k1')).resolves.toBe(blob);
    const [url, config] = mockedAxios.get.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/cafe/kots/k1/document');
    expect(config?.responseType).toBe('blob');
  });

  it('rejects rather than resolving empty when the document fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('offline'));
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.getKotPdf('k1')).rejects.toThrow('offline');
  });
});
