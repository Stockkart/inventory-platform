/**
 * Standard Base64 (RFC 4648 §4, `+` `/` with `=` padding) without any runtime dependency.
 *
 * Bytes cross the native bridge as Base64 text: the Android module encodes with
 * `android.util.Base64.NO_WRAP`, the server reads keys and signatures with `java.util.Base64`, and
 * both are this alphabet. `atob` / `btoa` are deliberately not used: they are string-based, differ
 * between Hermes and node, and are absent in some test runtimes.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DECODE = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE[ALPHABET.charCodeAt(i)] = i;
}

/** Base64 text of the bytes, with `=` padding and no line breaks. */
export function base64Encode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      ALPHABET[(n >>> 18) & 63] +
      ALPHABET[(n >>> 12) & 63] +
      ALPHABET[(n >>> 6) & 63] +
      ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + ALPHABET[(n >>> 6) & 63] + '=';
  }
  return out;
}

/**
 * Bytes of standard Base64 text. Whitespace is ignored (Java's `MIME` encoder and some native
 * encoders wrap lines); any other character outside the alphabet, or bad padding, throws.
 */
export function base64Decode(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, '');
  if (clean.length % 4 !== 0) {
    throw new Error('Base64 text length must be a multiple of 4');
  }
  let padding = 0;
  if (clean.endsWith('==')) {
    padding = 2;
  } else if (clean.endsWith('=')) {
    padding = 1;
  }
  const body = clean.slice(0, clean.length - padding);
  if (body.includes('=')) {
    throw new Error('Base64 padding may only appear at the end');
  }
  const out = new Uint8Array((clean.length / 4) * 3 - padding);
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    const v = c < 128 ? DECODE[c] : -1;
    if (v < 0) {
      throw new Error(`Base64 text has an invalid character at position ${i}`);
    }
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >>> bits) & 0xff;
    }
  }
  return out;
}
