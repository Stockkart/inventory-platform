import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { apiClient } from '@inventory-platform/api-client';
import { newKey } from '../lib/idempotencyAttempt';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// cafeTabApi's non-idempotent routes go through apiClient (platform/api-client), not raw
// axios, so the fixture is mocked directly rather than trying to make the real
// ApiClient's internal `axios.create()` work against the minimal axios mock above.
vi.mock('@inventory-platform/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);
const mockedApiClient = vi.mocked(apiClient, true);

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

describe('cafeKotApi.reprint', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  it('posts to the reprint URL with the Idempotency-Key header', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: { kotId: 'k1' } } });
    const { cafeKotApi } = await import('./cafe-kot.api');

    await cafeKotApi.reprint('k1', 'key-1');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, , config] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/cafe/kots/k1/reprint');
    expect(config?.headers?.['Idempotency-Key']).toBe('key-1');
  });

  it('rejects rather than resolving empty when the server errors', async () => {
    mockedAxios.post.mockRejectedValue(
      Object.assign(new Error('boom'), { response: { status: 500 } }),
    );
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.reprint('k1', 'key-1')).rejects.toThrow('boom');
  });
});

describe('cafeTabApi', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedApiClient.get.mockReset();
    mockedApiClient.post.mockReset();
    mockedApiClient.delete.mockReset();
  });

  it('lists tabs from the tab collection URL', async () => {
    const tabs = [{ id: 't1', tokenNo: '4', status: 'OPEN', lines: [] }];
    mockedApiClient.get.mockResolvedValue({ success: true, data: tabs });
    const { cafeTabApi } = await import('./cafe-kot.api');

    await expect(cafeTabApi.list()).resolves.toBe(tabs);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/cafe/tabs');
  });

  it('rejects rather than resolving empty when the list request fails', async () => {
    mockedApiClient.get.mockRejectedValue(new Error('offline'));
    const { cafeTabApi } = await import('./cafe-kot.api');

    await expect(cafeTabApi.list()).rejects.toThrow('offline');
  });

  it('opens a tab by posting to the tab collection URL', async () => {
    const tab = { id: 't1', tokenNo: '4', status: 'OPEN', lines: [] };
    mockedApiClient.post.mockResolvedValue({ success: true, data: tab });
    const { cafeTabApi } = await import('./cafe-kot.api');

    await expect(cafeTabApi.open()).resolves.toBe(tab);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/cafe/tabs');
  });

  it('adds a line by posting the line body to the tab lines URL', async () => {
    const tab = { id: 't1', tokenNo: '4', status: 'OPEN', lines: [] };
    mockedApiClient.post.mockResolvedValue({ success: true, data: tab });
    const { cafeTabApi } = await import('./cafe-kot.api');

    const line = { sellableRef: 'sr1', quantity: 2, note: 'no onions' };
    await cafeTabApi.addLine('t1', line);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/cafe/tabs/t1/lines', line);
  });

  it('removes a line via DELETE on the tab line URL', async () => {
    const tab = { id: 't1', tokenNo: '4', status: 'OPEN', lines: [] };
    mockedApiClient.delete.mockResolvedValue({ success: true, data: tab });
    const { cafeTabApi } = await import('./cafe-kot.api');

    await cafeTabApi.removeLine('t1', 'sr1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/cafe/tabs/t1/lines/sr1');
  });

  it('closes a tab via DELETE on the tab URL', async () => {
    mockedApiClient.delete.mockResolvedValue({ success: true, data: null });
    const { cafeTabApi } = await import('./cafe-kot.api');

    await cafeTabApi.close('t1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/cafe/tabs/t1');
  });

  describe('flush', () => {
    it('posts to the flush URL with the Idempotency-Key header and the chosen target', async () => {
      mockedAxios.post.mockResolvedValue({ data: { data: [] } });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('http://localhost:8080/api/v1/cafe/tabs/t1/flush');
      expect(body).toEqual({ purchaseId: 'p1' });
      expect(config?.headers?.['Idempotency-Key']).toBe('key-1');
    });

    it('posts a null purchaseId when the round asks for a new bill', async () => {
      mockedAxios.post.mockResolvedValue({ data: { data: [] } });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await cafeTabApi.flush('t1', { purchaseId: null }, 'key-1');

      const [, body] = mockedAxios.post.mock.calls[0];
      expect(body).toEqual({ purchaseId: null });
    });

    it('resolves with the created tickets from the response envelope', async () => {
      const tickets = [{ kotId: 'k1' }, { kotId: 'k2' }];
      mockedAxios.post.mockResolvedValue({ data: { data: tickets } });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await expect(cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1')).resolves.toBe(tickets);
    });

    it('rejects rather than resolving empty when the server errors', async () => {
      mockedAxios.post.mockRejectedValue(
        Object.assign(new Error('boom'), { response: { status: 500 } }),
      );
      const { cafeTabApi } = await import('./cafe-kot.api');

      await expect(cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1')).rejects.toThrow('boom');
    });

    it('reuses the same key across a retry of one flush attempt', async () => {
      mockedAxios.post.mockResolvedValue({ data: { data: [] } });
      const { cafeTabApi } = await import('./cafe-kot.api');

      const key = newKey();
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, key);
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, key); // retry of the same attempt

      const first = mockedAxios.post.mock.calls[0][2]?.headers?.['Idempotency-Key'];
      const second = mockedAxios.post.mock.calls[1][2]?.headers?.['Idempotency-Key'];
      expect(first).toBe(key);
      expect(second).toBe(key);
    });

    it('uses a different key for a second, independent flush attempt', async () => {
      mockedAxios.post.mockResolvedValue({ data: { data: [] } });
      const { cafeTabApi } = await import('./cafe-kot.api');

      const firstAttemptKey = newKey();
      const secondAttemptKey = newKey();

      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, firstAttemptKey);
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, secondAttemptKey);

      const first = mockedAxios.post.mock.calls[0][2]?.headers?.['Idempotency-Key'];
      const second = mockedAxios.post.mock.calls[1][2]?.headers?.['Idempotency-Key'];
      expect(first).not.toBe(second);
    });
  });
});
