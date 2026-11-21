import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { P256_FIELD_BYTES, derToRawEcdsa, rawToDerEcdsa } from './der';

const field = (bytes: number[]): Uint8Array => {
  const out = new Uint8Array(P256_FIELD_BYTES);
  out.set(bytes, P256_FIELD_BYTES - bytes.length);
  return out;
};

const raw = (r: Uint8Array, s: Uint8Array): Uint8Array => {
  const out = new Uint8Array(P256_FIELD_BYTES * 2);
  out.set(r, 0);
  out.set(s, P256_FIELD_BYTES);
  return out;
};

describe('rawToDerEcdsa', () => {
  it('encodes SEQUENCE { INTEGER r, INTEGER s } with minimal integers', () => {
    const der = rawToDerEcdsa(raw(field([0x01]), field([0x7f])));
    expect(Array.from(der)).toEqual([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x7f]);
  });

  it('prefixes 0x00 when the top bit of r or s is set (positive INTEGER)', () => {
    const der = rawToDerEcdsa(raw(field([0x80]), field([0x01])));
    expect(Array.from(der)).toEqual([0x30, 0x07, 0x02, 0x02, 0x00, 0x80, 0x02, 0x01, 0x01]);
  });

  it('encodes a full 32-byte r with top bit set as 33 content bytes', () => {
    const r = new Uint8Array(P256_FIELD_BYTES).fill(0xff);
    const der = rawToDerEcdsa(raw(r, field([0x01])));
    expect(der[0]).toBe(0x30);
    expect(der[2]).toBe(0x02);
    expect(der[3]).toBe(33);
    expect(der[4]).toBe(0x00);
    expect(der.length).toBe(2 + 2 + 33 + 2 + 1);
  });

  it('rejects a raw signature of the wrong length', () => {
    expect(() => rawToDerEcdsa(new Uint8Array(63))).toThrow(/64 bytes/);
  });
});

describe('derToRawEcdsa', () => {
  it('round-trips with rawToDerEcdsa for any r and s', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: P256_FIELD_BYTES, maxLength: P256_FIELD_BYTES }),
        fc.uint8Array({ minLength: P256_FIELD_BYTES, maxLength: P256_FIELD_BYTES }),
        (r, s) => {
          const der = rawToDerEcdsa(raw(r, s));
          expect(Array.from(derToRawEcdsa(der))).toEqual(Array.from(raw(r, s)));
          // The DER form is itself canonical: re-encoding the decoded raw gives the same bytes.
          expect(Array.from(rawToDerEcdsa(derToRawEcdsa(der)))).toEqual(Array.from(der));
        },
      ),
      { numRuns: 200 },
    );
  });

  it.each([
    [[0x02, 0x01, 0x01], 'not a SEQUENCE'],
    [[0x30, 0x03, 0x02, 0x01, 0x01], 'only one INTEGER'],
    [[0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x7f, 0x00], 'trailing byte'],
    [[0x30, 0x07, 0x02, 0x01, 0x01, 0x02, 0x01, 0x7f], 'SEQUENCE length does not match'],
    [[0x30, 0x06, 0x02, 0x01, 0x80, 0x02, 0x01, 0x01], 'negative r'],
    [[0x30, 0x07, 0x02, 0x02, 0x00, 0x01, 0x02, 0x01, 0x01], 'non-minimal r (leading zero)'],
    [[0x30, 0x06, 0x02, 0x00, 0x02, 0x01, 0x01, 0x01], 'empty INTEGER'],
    [
      [0x30, 0x27, 0x02, 0x22, 0x01, ...new Array(33).fill(0), 0x02, 0x01, 0x01],
      'r longer than 32 bytes',
    ],
  ])('rejects %j (%s)', (bytes) => {
    expect(() => derToRawEcdsa(new Uint8Array(bytes))).toThrow();
  });
});
