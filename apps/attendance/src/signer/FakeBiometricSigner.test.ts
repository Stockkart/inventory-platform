import { createPublicKey, verify as nodeVerify } from 'node:crypto';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { FakeBiometricSigner, verifyEcdsaSignature } from './FakeBiometricSigner';
import { base64Decode } from './base64';

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * What the server does: `java.security.Signature("SHA256withECDSA")` over a DER SPKI key and a
 * DER `ECDSA-Sig-Value`. Node's `verify` with a DER public key and `dsaEncoding: 'der'` (the
 * default) is the same check, independent of our own DER code.
 */
function verifyLikeJava(spkiBase64: string, data: Uint8Array, derSignature: Uint8Array): boolean {
  const key = createPublicKey({
    key: Buffer.from(base64Decode(spkiBase64)),
    format: 'der',
    type: 'spki',
  });
  return nodeVerify('sha256', data, key, derSignature);
}

describe('FakeBiometricSigner', () => {
  it('reports STRONG_BIOMETRIC_READY by default and whatever it is told otherwise', async () => {
    await expect(new FakeBiometricSigner().capability()).resolves.toBe('STRONG_BIOMETRIC_READY');
    const signer = new FakeBiometricSigner({ capability: 'NO_STRONG_BIOMETRIC_ENROLLED' });
    await expect(signer.capability()).resolves.toBe('NO_STRONG_BIOMETRIC_ENROLLED');
    signer.capabilityValue = 'NO_SECURE_HARDWARE';
    await expect(signer.capability()).resolves.toBe('NO_SECURE_HARDWARE');
  });

  it('createKeys returns two different P-256 SPKI public keys in Base64 DER', async () => {
    const keys = await new FakeBiometricSigner().createKeys();
    const punch = base64Decode(keys.punchPublicKeySpki);
    const device = base64Decode(keys.devicePublicKeySpki);
    // A P-256 SubjectPublicKeyInfo is 91 bytes: SEQUENCE (0x30 0x59) ... uncompressed point 0x04 ‖ X ‖ Y.
    expect(punch.length).toBe(91);
    expect(device.length).toBe(91);
    expect(Array.from(punch.subarray(0, 2))).toEqual([0x30, 0x59]);
    expect(punch[91 - 65]).toBe(0x04);
    expect(keys.punchPublicKeySpki).not.toBe(keys.devicePublicKeySpki);
    expect(
      createPublicKey({ key: Buffer.from(punch), format: 'der', type: 'spki' })
        .asymmetricKeyDetails,
    ).toMatchObject({ namedCurve: 'prime256v1' });
  });

  it('refuses to create keys when the phone has no secure hardware or no strong biometric', async () => {
    await expect(
      new FakeBiometricSigner({ capability: 'NO_SECURE_HARDWARE' }).createKeys(),
    ).rejects.toMatchObject({ code: 'NO_SECURE_HARDWARE' });
    await expect(
      new FakeBiometricSigner({ capability: 'NO_STRONG_BIOMETRIC_ENROLLED' }).createKeys(),
    ).rejects.toMatchObject({ code: 'NO_STRONG_BIOMETRIC' });
    await expect(
      new FakeBiometricSigner({ capability: 'NO_STRONG_BIOMETRIC_HARDWARE' }).createKeys(),
    ).rejects.toMatchObject({ code: 'NO_STRONG_BIOMETRIC' });
  });

  it('signPunch produces a DER signature the punch public key verifies, as WebCrypto and as Java would', async () => {
    const signer = new FakeBiometricSigner();
    const keys = await signer.createKeys();
    const payload = bytes('SKAT-PUNCH-1\npairingId=0123456789abcdef01234567');

    const signature = await signer.signPunch(payload);

    expect(signature[0]).toBe(0x30);
    expect(await verifyEcdsaSignature(keys.punchPublicKeySpki, payload, signature)).toBe(true);
    expect(verifyLikeJava(keys.punchPublicKeySpki, payload, signature)).toBe(true);
    // The device key did not sign it.
    expect(await verifyEcdsaSignature(keys.devicePublicKeySpki, payload, signature)).toBe(false);
    expect(signer.punchSignatures).toBe(1);
  });

  it('signRequest signs with the device key only', async () => {
    const signer = new FakeBiometricSigner();
    const keys = await signer.createKeys();
    const envelope = bytes('SKAT-REQ-1\nmethod=GET');

    const signature = await signer.signRequest(envelope);

    expect(verifyLikeJava(keys.devicePublicKeySpki, envelope, signature)).toBe(true);
    expect(await verifyEcdsaSignature(keys.punchPublicKeySpki, envelope, signature)).toBe(false);
    expect(signer.punchSignatures).toBe(0);
  });

  it('every signature over any payload verifies, and a changed payload or key does not', async () => {
    const signer = new FakeBiometricSigner();
    const keys = await signer.createKeys();
    const other = await new FakeBiometricSigner().createKeys();

    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 400 }),
        fc.nat({ max: 399 }),
        async (payload, flipAt) => {
          const signature = await signer.signPunch(payload);
          expect(verifyLikeJava(keys.punchPublicKeySpki, payload, signature)).toBe(true);
          expect(await verifyEcdsaSignature(keys.punchPublicKeySpki, payload, signature)).toBe(
            true,
          );

          const tampered = Uint8Array.from(payload);
          const i = flipAt % tampered.length;
          tampered[i] ^= 0x01;
          expect(await verifyEcdsaSignature(keys.punchPublicKeySpki, tampered, signature)).toBe(
            false,
          );
          expect(await verifyEcdsaSignature(other.punchPublicKeySpki, payload, signature)).toBe(
            false,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('scripts the biometric prompt: one outcome per signPunch, PASS when the queue is empty', async () => {
    const signer = new FakeBiometricSigner();
    await signer.createKeys();
    signer.nextPunchOutcomes = ['BIOMETRIC_CANCELLED', 'BIOMETRIC_FAILED', 'BIOMETRIC_LOCKED_OUT'];

    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({
      code: 'BIOMETRIC_CANCELLED',
    });
    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({ code: 'BIOMETRIC_FAILED' });
    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({
      code: 'BIOMETRIC_LOCKED_OUT',
    });
    expect(signer.punchSignatures).toBe(0);
    await expect(signer.signPunch(bytes('a'))).resolves.toBeInstanceOf(Uint8Array);
    expect(signer.punchSignatures).toBe(1);
  });

  it('records the prompt wording it was shown', async () => {
    const signer = new FakeBiometricSigner();
    await signer.createKeys();
    const prompt = { title: 'Check in', cancelLabel: 'Cancel' };
    await signer.signPunch(bytes('a'), prompt);
    expect(signer.prompts).toEqual([prompt]);
  });

  it('rejects with NO_KEYS before createKeys, after deleteKeys and after loseKeys', async () => {
    const signer = new FakeBiometricSigner();
    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({ code: 'NO_KEYS' });
    await expect(signer.signRequest(bytes('a'))).rejects.toMatchObject({ code: 'NO_KEYS' });

    await signer.createKeys();
    expect(signer.hasKeys()).toBe(true);
    await signer.deleteKeys();
    expect(signer.hasKeys()).toBe(false);
    await expect(signer.signRequest(bytes('a'))).rejects.toMatchObject({ code: 'NO_KEYS' });

    await signer.createKeys();
    signer.loseKeys();
    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({ code: 'NO_KEYS' });
    await expect(signer.deleteKeys()).resolves.toBeUndefined();
  });

  it('rejects with KEY_INVALIDATED after a biometric enrolment change until keys are recreated', async () => {
    const signer = new FakeBiometricSigner();
    const first = await signer.createKeys();
    signer.invalidatePunchKey();
    await expect(signer.signPunch(bytes('a'))).rejects.toMatchObject({ code: 'KEY_INVALIDATED' });
    // The device key is not biometric-gated and still works.
    await expect(signer.signRequest(bytes('a'))).resolves.toBeInstanceOf(Uint8Array);

    const second = await signer.createKeys();
    expect(second.punchPublicKeySpki).not.toBe(first.punchPublicKeySpki);
    await expect(signer.signPunch(bytes('a'))).resolves.toBeInstanceOf(Uint8Array);
  });

  it('createKeys replaces both keys so old signatures no longer verify against the new keys', async () => {
    const signer = new FakeBiometricSigner();
    const old = await signer.createKeys();
    const signature = await signer.signRequest(bytes('x'));
    const fresh = await signer.createKeys();
    expect(fresh.devicePublicKeySpki).not.toBe(old.devicePublicKeySpki);
    expect(await verifyEcdsaSignature(fresh.devicePublicKeySpki, bytes('x'), signature)).toBe(
      false,
    );
    expect(await verifyEcdsaSignature(old.devicePublicKeySpki, bytes('x'), signature)).toBe(true);
  });
});

describe('verifyEcdsaSignature', () => {
  it('returns false (never throws) for a bad key or a malformed signature', async () => {
    const signer = new FakeBiometricSigner();
    const keys = await signer.createKeys();
    const signature = await signer.signRequest(bytes('a'));
    expect(await verifyEcdsaSignature('AAAA', bytes('a'), signature)).toBe(false);
    expect(
      await verifyEcdsaSignature(keys.devicePublicKeySpki, bytes('a'), new Uint8Array([1, 2])),
    ).toBe(false);
  });
});
