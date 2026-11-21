import { describe, expect, it, vi } from 'vitest';

import { digest } from 'expo-crypto';

import { expoRandomUUID, expoSha256 } from './expoCrypto';

// expo-crypto imports react-native; the adapter is tested against a stand-in (vi.mock is hoisted).
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: vi.fn(async (algorithm: string, data: Uint8Array) => {
    if (algorithm !== 'SHA-256') {
      throw new Error(`unexpected algorithm ${algorithm}`);
    }
    return new Uint8Array([data.length]).buffer;
  }),
  randomUUID: () => '0F8FAD5B-D9CB-469F-A165-70867728950E',
}));

describe('expoCrypto adapter', () => {
  it('digests with SHA-256 through expo-crypto', async () => {
    const out = await expoSha256(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(out as ArrayBuffer)).toEqual(new Uint8Array([3]));
    expect(digest).toHaveBeenCalledWith('SHA-256', new Uint8Array([1, 2, 3]));
  });

  it('lowercases the UUID so the canonical builders accept it', () => {
    expect(expoRandomUUID()).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
  });
});
