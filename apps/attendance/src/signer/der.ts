/**
 * ECDSA signature encodings for P-256.
 *
 * The server verifies with `java.security.Signature("SHA256withECDSA")`, which reads a DER
 * `ECDSA-Sig-Value ::= SEQUENCE { r INTEGER, s INTEGER }`. Android (`SHA256withECDSA`) and iOS
 * (`.ecdsaSignatureMessageX962SHA256`) already produce DER, so the native module passes it through.
 * WebCrypto (`crypto.subtle`, used by the test fake) produces the IEEE P1363 form `r ‖ s` with
 * fixed 32-byte halves; these helpers convert between the two.
 */

/** Byte length of a P-256 field element (and so of `r` and `s`). */
export const P256_FIELD_BYTES = 32;

/** DER `ECDSA-Sig-Value` of a raw `r ‖ s` signature with `fieldBytes`-byte halves. */
export function rawToDerEcdsa(raw: Uint8Array, fieldBytes = P256_FIELD_BYTES): Uint8Array {
  if (raw.length !== fieldBytes * 2) {
    throw new Error(`raw ECDSA signature must be ${fieldBytes * 2} bytes, got ${raw.length}`);
  }
  const r = derInteger(raw.subarray(0, fieldBytes));
  const s = derInteger(raw.subarray(fieldBytes));
  const body = new Uint8Array(r.length + s.length);
  body.set(r, 0);
  body.set(s, r.length);
  return concat(new Uint8Array([0x30]), derLength(body.length), body);
}

/** Raw `r ‖ s` (each left-padded to `fieldBytes`) of a DER `ECDSA-Sig-Value`. Throws on malformed input. */
export function derToRawEcdsa(der: Uint8Array, fieldBytes = P256_FIELD_BYTES): Uint8Array {
  const reader = new DerReader(der);
  if (reader.readByte() !== 0x30) {
    throw new Error('ECDSA-Sig-Value must start with a SEQUENCE');
  }
  const seqLength = reader.readLength();
  if (reader.remaining() !== seqLength) {
    throw new Error('ECDSA-Sig-Value SEQUENCE length does not match the input');
  }
  const r = reader.readInteger(fieldBytes);
  const s = reader.readInteger(fieldBytes);
  if (reader.remaining() !== 0) {
    throw new Error('ECDSA-Sig-Value has trailing bytes');
  }
  const out = new Uint8Array(fieldBytes * 2);
  out.set(r, 0);
  out.set(s, fieldBytes);
  return out;
}

/** DER INTEGER (tag, length, minimal two's-complement big-endian content) of an unsigned big-endian number. */
function derInteger(unsigned: Uint8Array): Uint8Array {
  let start = 0;
  while (start < unsigned.length - 1 && unsigned[start] === 0) {
    start++;
  }
  const magnitude = unsigned.subarray(start);
  const needsLeadingZero = (magnitude[0] & 0x80) !== 0;
  const content = needsLeadingZero ? concat(new Uint8Array([0x00]), magnitude) : magnitude;
  return concat(new Uint8Array([0x02]), derLength(content.length), content);
}

function derLength(length: number): Uint8Array {
  if (length < 0x80) {
    return new Uint8Array([length]);
  }
  if (length <= 0xff) {
    return new Uint8Array([0x81, length]);
  }
  if (length <= 0xffff) {
    return new Uint8Array([0x82, length >>> 8, length & 0xff]);
  }
  throw new Error('DER length too large for an ECDSA signature');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

class DerReader {
  private pos = 0;

  constructor(private readonly bytes: Uint8Array) {}

  remaining(): number {
    return this.bytes.length - this.pos;
  }

  readByte(): number {
    if (this.pos >= this.bytes.length) {
      throw new Error('DER input ended early');
    }
    return this.bytes[this.pos++];
  }

  readLength(): number {
    const first = this.readByte();
    if (first < 0x80) {
      return first;
    }
    const count = first & 0x7f;
    if (count === 0 || count > 2) {
      throw new Error('DER length form not supported for an ECDSA signature');
    }
    let length = 0;
    for (let i = 0; i < count; i++) {
      length = (length << 8) | this.readByte();
    }
    if (length < 0x80) {
      throw new Error('DER length is not minimally encoded');
    }
    return length;
  }

  /** Reads an INTEGER and returns its magnitude left-padded to `fieldBytes`. */
  readInteger(fieldBytes: number): Uint8Array {
    if (this.readByte() !== 0x02) {
      throw new Error('expected a DER INTEGER');
    }
    const length = this.readLength();
    if (length === 0 || length > this.remaining()) {
      throw new Error('DER INTEGER has an invalid length');
    }
    let content = this.bytes.subarray(this.pos, this.pos + length);
    this.pos += length;
    if ((content[0] & 0x80) !== 0) {
      throw new Error('ECDSA r and s must be positive');
    }
    if (content.length > 1 && content[0] === 0x00 && (content[1] & 0x80) === 0) {
      throw new Error('DER INTEGER is not minimally encoded');
    }
    if (content[0] === 0x00 && content.length > 1) {
      content = content.subarray(1);
    }
    if (content.length > fieldBytes) {
      throw new Error(`ECDSA integer is longer than ${fieldBytes} bytes`);
    }
    const out = new Uint8Array(fieldBytes);
    out.set(content, fieldBytes - content.length);
    return out;
  }
}
