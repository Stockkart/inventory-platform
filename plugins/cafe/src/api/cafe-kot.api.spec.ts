import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@inventory-platform/api-client';
import { newKey } from '../lib/idempotencyAttempt';

/**
 * Every call in this module — the kitchen-facing writes included — goes through
 * `apiClient`, so the session interceptors (401 → re-login, 402 → plan expired, AxiosError →
 * ApiError) apply to them. These tests mock that client directly rather than trying to make
 * the real `ApiClient`'s internal `axios.create()` work against a stub: what they assert is
 * the path, the body and the per-call `Idempotency-Key` header this layer is responsible for.
 *
 * `axios` itself is deliberately NOT mocked here. If a call ever slips back onto raw axios it
 * will fail these assertions rather than quietly bypassing the interceptors again.
 */
vi.mock('@inventory-platform/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
    postBlob: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient, true);

beforeEach(() => {
  mockedApiClient.get.mockReset();
  mockedApiClient.post.mockReset();
  mockedApiClient.delete.mockReset();
  mockedApiClient.getBlob.mockReset();
  mockedApiClient.postBlob.mockReset();
});

describe('cafeKotApi.getKotPdf', () => {
  it('fetches the ticket document as a blob', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    mockedApiClient.getBlob.mockResolvedValue(blob);
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.getKotPdf('k1')).resolves.toBe(blob);
    expect(mockedApiClient.getBlob).toHaveBeenCalledWith('/cafe/kots/k1/document');
  });

  it('rejects rather than resolving empty when the document fetch fails', async () => {
    mockedApiClient.getBlob.mockRejectedValue(new Error('offline'));
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.getKotPdf('k1')).rejects.toThrow('offline');
  });
});

describe('cafeKotApi.reprint', () => {
  it('posts to the reprint URL with the Idempotency-Key header', async () => {
    mockedApiClient.postBlob.mockResolvedValue(new Blob(['%PDF']));
    const { cafeKotApi } = await import('./cafe-kot.api');

    await cafeKotApi.reprint('k1', 'key-1');

    expect(mockedApiClient.postBlob).toHaveBeenCalledTimes(1);
    const [url, body, options] = mockedApiClient.postBlob.mock.calls[0];
    expect(url).toBe('/cafe/kots/k1/reprint');
    expect(body).toBeUndefined();
    expect(options?.headers?.['Idempotency-Key']).toBe('key-1');
  });

  // The stamp lives only on the reprint render: GET .../document never stamps REPRINT, so
  // reading this response as JSON and fetching the PDF separately would hand a cook an
  // unstamped slip for food already being made.
  it('reads the stamped slip itself rather than a JSON body', async () => {
    const slip = new Blob(['%PDF']);
    mockedApiClient.postBlob.mockResolvedValue(slip);
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.reprint('k1', 'key-1')).resolves.toBe(slip);
    // A blob-bodied POST, not the JSON `post` helper.
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('rejects rather than resolving empty when the server errors', async () => {
    mockedApiClient.postBlob.mockRejectedValue(new Error('boom'));
    const { cafeKotApi } = await import('./cafe-kot.api');

    await expect(cafeKotApi.reprint('k1', 'key-1')).rejects.toThrow('boom');
  });
});

describe('cafeTabApi', () => {
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
      mockedApiClient.post.mockResolvedValue({ success: true, data: [] });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1');

      expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
      const [url, body, options] = mockedApiClient.post.mock.calls[0];
      expect(url).toBe('/cafe/tabs/t1/flush');
      expect(body).toEqual({ purchaseId: 'p1' });
      expect(
        (options as { headers?: Record<string, string> } | undefined)?.headers?.['Idempotency-Key'],
      ).toBe('key-1');
    });

    it('posts a null purchaseId when the round asks for a new bill', async () => {
      mockedApiClient.post.mockResolvedValue({ success: true, data: [] });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await cafeTabApi.flush('t1', { purchaseId: null }, 'key-1');

      const [, body] = mockedApiClient.post.mock.calls[0];
      expect(body).toEqual({ purchaseId: null });
    });

    it('resolves with the created tickets from the response envelope', async () => {
      const tickets = [{ kotId: 'k1' }, { kotId: 'k2' }];
      mockedApiClient.post.mockResolvedValue({ success: true, data: tickets });
      const { cafeTabApi } = await import('./cafe-kot.api');

      await expect(cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1')).resolves.toBe(tickets);
    });

    it('rejects rather than resolving empty when the server errors', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('boom'));
      const { cafeTabApi } = await import('./cafe-kot.api');

      await expect(cafeTabApi.flush('t1', { purchaseId: 'p1' }, 'key-1')).rejects.toThrow('boom');
    });

    it('reuses the same key across a retry of one flush attempt', async () => {
      mockedApiClient.post.mockResolvedValue({ success: true, data: [] });
      const { cafeTabApi } = await import('./cafe-kot.api');

      const key = newKey();
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, key);
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, key); // retry of the same attempt

      const headerOf = (call: number) =>
        (mockedApiClient.post.mock.calls[call][2] as { headers?: Record<string, string> })
          ?.headers?.['Idempotency-Key'];
      expect(headerOf(0)).toBe(key);
      expect(headerOf(1)).toBe(key);
    });

    it('uses a different key for a second, independent flush attempt', async () => {
      mockedApiClient.post.mockResolvedValue({ success: true, data: [] });
      const { cafeTabApi } = await import('./cafe-kot.api');

      const firstAttemptKey = newKey();
      const secondAttemptKey = newKey();

      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, firstAttemptKey);
      await cafeTabApi.flush('t1', { purchaseId: 'p1' }, secondAttemptKey);

      const headerOf = (call: number) =>
        (mockedApiClient.post.mock.calls[call][2] as { headers?: Record<string, string> })
          ?.headers?.['Idempotency-Key'];
      expect(headerOf(0)).not.toBe(headerOf(1));
    });
  });
});
