import { describe, expect, it } from 'vitest';
import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_QR_PREFIX,
  isPairingCode,
  normalisePairingCode,
  pairingCodeFromScan,
  pairingQrPayload,
} from './pairing-code.js';

describe('pairing codes (R2.3)', () => {
  it('alphabet is the Java one: 32 capital letters and digits without 0, O, 1 and I', () => {
    expect(PAIRING_CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    expect(PAIRING_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(PAIRING_CODE_ALPHABET).size).toBe(32);
    for (const banned of ['0', 'O', '1', 'I']) {
      expect(PAIRING_CODE_ALPHABET).not.toContain(banned);
    }
    expect(PAIRING_CODE_LENGTH).toBe(8);
  });

  it('normalise trims, upper-cases and drops spaces and hyphens, like Java', () => {
    expect(normalisePairingCode('  ab2c-d3ef ')).toBe('AB2CD3EF');
    expect(normalisePairingCode('ab2c d3ef')).toBe('AB2CD3EF');
    expect(normalisePairingCode('AB2CD3EF')).toBe('AB2CD3EF');
    expect(normalisePairingCode(null)).toBe('');
    expect(normalisePairingCode(undefined)).toBe('');
    expect(normalisePairingCode('')).toBe('');
  });

  it('isPairingCode accepts exactly 8 alphabet characters', () => {
    expect(isPairingCode('AB2CD3EF')).toBe(true);
    expect(isPairingCode('ZZZZZZZZ')).toBe(true);
    expect(isPairingCode('ab2cd3ef')).toBe(false); // not normalised
    expect(isPairingCode('AB2CD3E')).toBe(false);
    expect(isPairingCode('AB2CD3EFG')).toBe(false);
    expect(isPairingCode('AB0CD3EF')).toBe(false);
    expect(isPairingCode('ABOCD3EF')).toBe(false);
    expect(isPairingCode('AB1CD3EF')).toBe(false);
    expect(isPairingCode('ABICD3EF')).toBe(false);
    expect(isPairingCode('AB2C-3EF')).toBe(false);
    expect(isPairingCode(null)).toBe(false);
    expect(isPairingCode(undefined)).toBe(false);
  });

  it('QR payload is the Java one and parses back', () => {
    expect(PAIRING_QR_PREFIX).toBe('https://stockkart.in/attendance/pair#');
    expect(pairingQrPayload('AB2CD3EF')).toBe('https://stockkart.in/attendance/pair#AB2CD3EF');
    expect(pairingCodeFromScan(pairingQrPayload('AB2CD3EF'))).toBe('AB2CD3EF');
  });

  it('scan accepts the QR URL or the bare code, in any case, with spaces or hyphens', () => {
    expect(pairingCodeFromScan('AB2CD3EF')).toBe('AB2CD3EF');
    expect(pairingCodeFromScan(' ab2c-d3ef ')).toBe('AB2CD3EF');
    expect(pairingCodeFromScan('HTTPS://STOCKKART.IN/attendance/pair#ab2c d3ef')).toBe('AB2CD3EF');
    expect(pairingCodeFromScan('https://stockkart.in/attendance/pair#AB2C-D3EF')).toBe('AB2CD3EF');
  });

  it('scan returns null for anything that is not a valid code', () => {
    expect(pairingCodeFromScan('https://stockkart.in/attendance/pair#')).toBeNull();
    expect(pairingCodeFromScan('https://stockkart.in/attendance/pair#AB0CD3EF')).toBeNull();
    expect(pairingCodeFromScan('https://example.com/#AB2CD3EF')).toBeNull();
    expect(pairingCodeFromScan('AB2CD3E')).toBeNull();
    expect(pairingCodeFromScan('')).toBeNull();
    expect(pairingCodeFromScan(null)).toBeNull();
    expect(pairingCodeFromScan(undefined)).toBeNull();
  });
});
