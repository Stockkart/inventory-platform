import { afterEach, describe, expect, it, vi } from 'vitest';

import { requireHttpsUrl } from './config';

const VAR = 'EXPO_PUBLIC_API_URL';

describe('requireHttpsUrl', () => {
  it('returns an https URL unchanged apart from trimming and trailing slashes', () => {
    expect(requireHttpsUrl(VAR, 'https://api.example.in/api/v1')).toBe(
      'https://api.example.in/api/v1',
    );
    expect(requireHttpsUrl(VAR, '  https://api.example.in/api/v1/  ')).toBe(
      'https://api.example.in/api/v1',
    );
    expect(requireHttpsUrl(VAR, 'https://api.example.in:8443')).toBe('https://api.example.in:8443');
  });

  it.each([
    ['http://api.example.in/api/v1', 'plain http'],
    ['HTTPS://api.example.in', 'upper-case scheme'],
    ['api.example.in', 'no scheme'],
    ['https:/api.example.in', 'one slash'],
    ['https://', 'no host'],
    ['https:// api.example.in', 'space before host'],
    ['ftp://api.example.in', 'other scheme'],
  ])('rejects %s (%s)', (value) => {
    expect(() => requireHttpsUrl(VAR, value)).toThrow(/must be an https:\/\/ URL/);
  });

  it.each([undefined, '', '   '])('rejects a missing value %j', (value) => {
    expect(() => requireHttpsUrl(VAR, value)).toThrow(/EXPO_PUBLIC_API_URL is not set/);
  });

  it('names the variable in every error message', () => {
    expect(() => requireHttpsUrl('SOME_NAME', 'http://x')).toThrow(/^SOME_NAME /);
    expect(() => requireHttpsUrl('SOME_NAME', '')).toThrow(/^SOME_NAME /);
  });
});

describe('config module', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('exports API_URL from EXPO_PUBLIC_API_URL when it is https', async () => {
    vi.stubEnv(VAR, 'https://api.example.in/api/v1/');
    vi.resetModules();
    const { API_URL } = await import('./config');
    expect(API_URL).toBe('https://api.example.in/api/v1');
  });

  it('throws at import time when EXPO_PUBLIC_API_URL is plain http', async () => {
    vi.stubEnv(VAR, 'http://api.example.in/api/v1');
    vi.resetModules();
    await expect(import('./config')).rejects.toThrow(/must be an https:\/\/ URL/);
  });

  it('throws at import time when EXPO_PUBLIC_API_URL is missing', async () => {
    vi.stubEnv(VAR, '');
    vi.resetModules();
    await expect(import('./config')).rejects.toThrow(/is not set/);
  });
});
