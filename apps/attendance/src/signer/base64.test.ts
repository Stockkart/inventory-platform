import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { base64Decode, base64Encode } from './base64';

describe('base64Encode / base64Decode', () => {
  it.each([
    [[], ''],
    [[0x66], 'Zg=='],
    [[0x66, 0x6f], 'Zm8='],
    [[0x66, 0x6f, 0x6f], 'Zm9v'],
    [[0x66, 0x6f, 0x6f, 0x62], 'Zm9vYg=='],
    [[0xff, 0xfe, 0xfd], '//79'],
  ])('encodes %j as %s (RFC 4648 vectors)', (bytes, text) => {
    expect(base64Encode(new Uint8Array(bytes))).toBe(text);
    expect(Array.from(base64Decode(text))).toEqual(bytes);
  });

  it('round-trips any byte string and agrees with Buffer', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 300 }), (bytes) => {
        const text = base64Encode(bytes);
        expect(text).toBe(Buffer.from(bytes).toString('base64'));
        expect(Array.from(base64Decode(text))).toEqual(Array.from(bytes));
      }),
      { numRuns: 200 },
    );
  });

  it('ignores whitespace in the input (wrapped lines from other encoders)', () => {
    expect(Array.from(base64Decode('Zm9v\nYmFy\r\n'))).toEqual(Array.from(Buffer.from('foobar')));
  });

  it.each([
    ['Zm9', 'length not a multiple of 4'],
    ['Zm9v*A==', 'character outside the alphabet'],
    ['Zm=vYmFy', 'padding in the middle'],
    ['Zm9v-A==', 'url-safe alphabet'],
  ])('rejects %s (%s)', (text) => {
    expect(() => base64Decode(text)).toThrow();
  });
});
