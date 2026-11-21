import { describe, expect, it, vi } from 'vitest';

import type {
  BiometricSignerNativeModule,
  NativeSignerCapability,
} from '../../modules/biometric-signer/src/BiometricSigner.types';
import {
  BiometricSignerError,
  DEFAULT_SIGN_PROMPT,
  NativeBiometricSigner,
  isBiometricSignerError,
  toBiometricSignerError,
  type BiometricSignerErrorCode,
} from './BiometricSigner';
import { base64Decode, base64Encode } from './base64';

/** What Expo hands JS when Kotlin rejects: an Error carrying `code`. */
function nativeRejection(code: string, message = `native ${code}`): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function nativeModule(
  overrides: Partial<BiometricSignerNativeModule> = {},
): BiometricSignerNativeModule {
  return {
    capability: vi.fn(async () => 'STRONG_BIOMETRIC_READY' as NativeSignerCapability),
    createKeys: vi.fn(async () => ({ punchPublicKey: 'UFVOQ0g=', devicePublicKey: 'REVWSUNF' })),
    hasKeys: vi.fn(async () => true),
    signPunch: vi.fn(async () => 'c2lnbmVk'),
    signRequest: vi.fn(async () => 'ZW52ZWxvcGU='),
    deleteKeys: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('toBiometricSignerError', () => {
  it.each<BiometricSignerErrorCode>([
    'BIOMETRIC_FAILED',
    'BIOMETRIC_CANCELLED',
    'BIOMETRIC_LOCKED_OUT',
    'KEY_INVALIDATED',
    'NO_SECURE_HARDWARE',
    'NO_STRONG_BIOMETRIC',
    'NO_KEYS',
  ])('keeps the native code %s and its message', (code) => {
    const mapped = toBiometricSignerError(nativeRejection(code, 'what the OS said'));
    expect(mapped).toBeInstanceOf(BiometricSignerError);
    expect(mapped.code).toBe(code);
    expect(mapped.message).toBe('what the OS said');
    expect(mapped.nativeCode).toBeUndefined();
  });

  it.each([
    'ERR_MISSING_ACTIVITY',
    'ERR_REACT_CONTEXT_LOST',
    'SIGNER_ERROR',
    'INVALID_ARGUMENT',
    'SOMETHING_NEW',
  ])('maps the unknown native code %s to SIGNER_UNAVAILABLE and keeps it as nativeCode', (code) => {
    const mapped = toBiometricSignerError(nativeRejection(code));
    expect(mapped.code).toBe('SIGNER_UNAVAILABLE');
    expect(mapped.nativeCode).toBe(code);
    expect(mapped.message).toBe(`native ${code}`);
  });

  it('maps errors without a code, strings and junk to SIGNER_UNAVAILABLE', () => {
    expect(toBiometricSignerError(new Error('boom')).code).toBe('SIGNER_UNAVAILABLE');
    expect(toBiometricSignerError(new Error('boom')).message).toBe('boom');
    expect(toBiometricSignerError('text').message).toBe('text');
    expect(toBiometricSignerError(undefined).code).toBe('SIGNER_UNAVAILABLE');
    expect(toBiometricSignerError({ code: 42 }).nativeCode).toBeUndefined();
  });

  it('returns a BiometricSignerError unchanged', () => {
    const error = new BiometricSignerError('NO_KEYS');
    expect(toBiometricSignerError(error)).toBe(error);
  });

  it('gives every code a default message', () => {
    for (const code of [
      'BIOMETRIC_FAILED',
      'BIOMETRIC_CANCELLED',
      'BIOMETRIC_LOCKED_OUT',
      'KEY_INVALIDATED',
      'NO_SECURE_HARDWARE',
      'NO_STRONG_BIOMETRIC',
      'NO_KEYS',
      'SIGNER_UNAVAILABLE',
    ] as const) {
      const error = new BiometricSignerError(code);
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.name).toBe('BiometricSignerError');
    }
  });
});

describe('isBiometricSignerError', () => {
  it('narrows by code when one is given', () => {
    const error = new BiometricSignerError('BIOMETRIC_CANCELLED');
    expect(isBiometricSignerError(error)).toBe(true);
    expect(isBiometricSignerError(error, 'BIOMETRIC_CANCELLED')).toBe(true);
    expect(isBiometricSignerError(error, 'BIOMETRIC_FAILED')).toBe(false);
    expect(isBiometricSignerError(new Error('x'))).toBe(false);
    expect(isBiometricSignerError(nativeRejection('BIOMETRIC_CANCELLED'))).toBe(false);
  });
});

describe('NativeBiometricSigner', () => {
  it.each<NativeSignerCapability>([
    'STRONG_BIOMETRIC_READY',
    'NO_SECURE_HARDWARE',
    'NO_STRONG_BIOMETRIC_ENROLLED',
    'NO_STRONG_BIOMETRIC_HARDWARE',
  ])('passes the capability %s through unchanged', async (capability) => {
    const signer = new NativeBiometricSigner(
      nativeModule({ capability: vi.fn(async () => capability) }),
    );
    await expect(signer.capability()).resolves.toBe(capability);
  });

  it('renames the public keys to the shape POST /pairings/complete wants', async () => {
    const signer = new NativeBiometricSigner(nativeModule());
    await expect(signer.createKeys()).resolves.toEqual({
      punchPublicKeySpki: 'UFVOQ0g=',
      devicePublicKeySpki: 'REVWSUNF',
    });
  });

  it('passes the attestation challenge as Base64 and keeps the chain the module returns (task 16.4)', async () => {
    const chain = ['TEVBRg==', 'Uk9PVA=='];
    const native = nativeModule({
      createKeys: vi.fn(async () => ({
        punchPublicKey: 'UFVOQ0g=',
        devicePublicKey: 'REVWSUNF',
        punchAttestationChain: chain,
      })),
    });
    const signer = new NativeBiometricSigner(native);

    const keys = await signer.createKeys({ attestationChallenge: new Uint8Array([1, 2, 3]) });

    expect(native.createKeys).toHaveBeenCalledWith({ attestationChallenge: 'AQID' });
    expect(keys.punchAttestationChain).toEqual(chain);
  });

  it('sends no challenge and reports no chain when none is asked for or returned', async () => {
    const native = nativeModule();
    const keys = await new NativeBiometricSigner(native).createKeys();
    expect(native.createKeys).toHaveBeenCalledWith({});
    expect('punchAttestationChain' in keys).toBe(false);

    const empty = nativeModule({
      createKeys: vi.fn(async () => ({
        punchPublicKey: 'UFVOQ0g=',
        devicePublicKey: 'REVWSUNF',
        punchAttestationChain: [],
      })),
    });
    const keys2 = await new NativeBiometricSigner(empty).createKeys({
      attestationChallenge: new Uint8Array([9]),
    });
    expect('punchAttestationChain' in keys2).toBe(false);
  });

  it('sends the payload as Base64 with the default prompt and decodes the Base64 signature', async () => {
    const native = nativeModule();
    const signer = new NativeBiometricSigner(native);
    const payload = new Uint8Array([0, 1, 2, 250, 251, 252]);

    const signature = await signer.signPunch(payload);

    expect(native.signPunch).toHaveBeenCalledWith(base64Encode(payload), DEFAULT_SIGN_PROMPT);
    expect(Array.from(signature)).toEqual(Array.from(base64Decode('c2lnbmVk')));
  });

  it('passes a custom prompt to the native module', async () => {
    const native = nativeModule();
    const prompt = { title: 'Check in', subtitle: 'Shop A', cancelLabel: 'Not now' };
    await new NativeBiometricSigner(native).signPunch(new Uint8Array([1]), prompt);
    expect(native.signPunch).toHaveBeenCalledWith('AQ==', prompt);
  });

  it('signs request envelopes with the device key and decodes the result', async () => {
    const native = nativeModule();
    const signature = await new NativeBiometricSigner(native).signRequest(new Uint8Array([9, 9]));
    expect(native.signRequest).toHaveBeenCalledWith('CQk=');
    expect(Array.from(signature)).toEqual(Array.from(base64Decode('ZW52ZWxvcGU=')));
  });

  it('deletes keys through the module', async () => {
    const native = nativeModule();
    await new NativeBiometricSigner(native).deleteKeys();
    expect(native.deleteKeys).toHaveBeenCalledTimes(1);
  });

  it.each<[BiometricSignerErrorCode, keyof BiometricSignerNativeModule]>([
    ['BIOMETRIC_FAILED', 'signPunch'],
    ['BIOMETRIC_CANCELLED', 'signPunch'],
    ['BIOMETRIC_LOCKED_OUT', 'signPunch'],
    ['KEY_INVALIDATED', 'signPunch'],
    ['NO_KEYS', 'signPunch'],
    ['NO_KEYS', 'signRequest'],
    ['NO_SECURE_HARDWARE', 'createKeys'],
    ['NO_STRONG_BIOMETRIC', 'createKeys'],
  ])('rejects %s from %s as a BiometricSignerError with that code', async (code, method) => {
    const native = nativeModule({
      [method]: vi.fn(async () => {
        throw nativeRejection(code);
      }),
    });
    const signer = new NativeBiometricSigner(native);
    const call =
      method === 'createKeys'
        ? signer.createKeys()
        : method === 'signRequest'
        ? signer.signRequest(new Uint8Array([1]))
        : signer.signPunch(new Uint8Array([1]));
    await expect(call).rejects.toMatchObject({ name: 'BiometricSignerError', code });
  });

  it('wraps an unknown native failure as SIGNER_UNAVAILABLE even for capability()', async () => {
    const signer = new NativeBiometricSigner(
      nativeModule({
        capability: vi.fn(async () => {
          throw nativeRejection('ERR_REACT_CONTEXT_LOST');
        }),
      }),
    );
    await expect(signer.capability()).rejects.toMatchObject({
      code: 'SIGNER_UNAVAILABLE',
      nativeCode: 'ERR_REACT_CONTEXT_LOST',
    });
  });

  it('treats a non-Base64 answer from the module as a signer failure, not a signature', async () => {
    const signer = new NativeBiometricSigner(
      nativeModule({ signRequest: vi.fn(async () => 'not base64!') }),
    );
    await expect(signer.signRequest(new Uint8Array([1]))).rejects.toMatchObject({
      code: 'SIGNER_UNAVAILABLE',
    });
  });
});
