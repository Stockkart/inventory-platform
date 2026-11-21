import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, String(value)),
  };
}

describe('token storage key', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('window', { setTimeout });
    vi.stubGlobal('localStorage', memoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the shop token under auth_token by default', async () => {
    const { apiClient } = await import('./client');
    apiClient.setToken('shop-token');
    expect(localStorage.getItem('auth_token')).toBe('shop-token');
    expect(apiClient.hasToken()).toBe(true);
  });

  it('keeps an admin token apart from the shop token', async () => {
    localStorage.setItem('auth_token', 'shop-token');
    const { apiClient } = await import('./client');

    apiClient.setTokenStorageKey('stockkart_admin_token');
    expect(apiClient.hasToken()).toBe(false);

    apiClient.setToken('admin-token');
    expect(localStorage.getItem('stockkart_admin_token')).toBe('admin-token');
    expect(localStorage.getItem('auth_token')).toBe('shop-token');

    apiClient.setToken(null);
    expect(localStorage.getItem('stockkart_admin_token')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBe('shop-token');
  });

  it('picks up a token already stored under the new key', async () => {
    localStorage.setItem('stockkart_admin_token', 'admin-token');
    const { apiClient } = await import('./client');
    apiClient.setTokenStorageKey('stockkart_admin_token');
    expect(apiClient.hasToken()).toBe(true);
  });
});
