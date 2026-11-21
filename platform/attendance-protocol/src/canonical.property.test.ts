// Task 9.3 — Property 1 (Signature round trip, R5.6, R5.12) and Property 20 (The punch payload
// never carries coordinates, R9.2) for the TypeScript side of the canonical payloads. Signing uses
// WebCrypto ECDSA P-256 through `globalThis.crypto.subtle`, as the phone does; the independent
// oracles are a ten-line re-implementation of the punch format written out here and Node's
// `createHash` for the envelope's body digest, so neither side of each comparison is the code
// under test.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  PUNCH_PAYLOAD_VERSION,
  REQUEST_ENVELOPE_VERSION,
  bytesToHex,
  canonicalPunchPayload,
  canonicalPunchPayloadText,
  canonicalRequestEnvelopeText,
  type RequestEnvelopeFields,
} from './canonical.js';
import type { AppPunchFields } from './types.js';

const NUM_RUNS = 100;
const subtle = globalThis.crypto.subtle;

interface CanonicalFixture {
  punches: { name: string; input: AppPunchFields; canonicalHex: string }[];
}

const fixture: CanonicalFixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/canonical.json', import.meta.url)), 'utf8'),
);

// --- generators ---

const hexChars = [...'0123456789abcdef'];
const hex = (length: number) =>
  fc
    .array(fc.constantFrom(...hexChars), { minLength: length, maxLength: length })
    .map((a) => a.join(''));
const objectId = hex(24);
const uuid = fc.uuid().map((u) => u.toLowerCase());
/** 1970 to 2100, whole seconds, formatted without the module under test. */
const phoneTime = fc
  .integer({ min: 0, max: 4_102_444_800 })
  .map((s) => `${new Date(s * 1000).toISOString().slice(0, 19)}Z`);
const metres = fc.option(fc.integer({ min: 0, max: 2_147_483_647 }), { nil: null });

const punchFields: fc.Arbitrary<AppPunchFields> = fc.record({
  pairingId: objectId,
  shopId: objectId,
  employeeId: objectId,
  punchId: uuid,
  phoneTime,
  offline: fc.boolean(),
  locationChecked: fc.boolean(),
  distanceMetres: metres,
  accuracyMetres: metres,
  mock: fc.boolean(),
});

const PUNCH_KEYS = [
  'pairingId',
  'shopId',
  'employeeId',
  'punchId',
  'phoneTime',
  'offline',
  'locationChecked',
  'distanceMetres',
  'accuracyMetres',
  'mock',
] as const satisfies readonly (keyof AppPunchFields)[];

const punchKey = fc.constantFrom(...PUNCH_KEYS);

/** Independent oracle: the design's ten-line format written out by hand (DD3). */
function oraclePunchPayload(f: AppPunchFields): Uint8Array {
  const b = (v: boolean) => (v ? '1' : '0');
  const m = (v: number | null) => (v === null ? '-' : String(v));
  const text =
    'SKAT-PUNCH-1\n' +
    `pairingId=${f.pairingId}\n` +
    `shopId=${f.shopId}\n` +
    `employeeId=${f.employeeId}\n` +
    `punchId=${f.punchId}\n` +
    `phoneTime=${f.phoneTime}\n` +
    `offline=${b(f.offline)}\n` +
    `locationChecked=${b(f.locationChecked)}\n` +
    `distanceMetres=${m(f.distanceMetres)}\n` +
    `accuracyMetres=${m(f.accuracyMetres)}\n` +
    `mock=${b(f.mock)}`;
  return new TextEncoder().encode(text);
}

const ECDSA_P256 = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

async function freshKeyPair(): Promise<CryptoKeyPair> {
  return subtle.generateKey(ECDSA_P256, true, ['sign', 'verify']);
}

async function verify(key: CryptoKey, payload: Uint8Array, signature: Uint8Array) {
  try {
    return await subtle.verify(ECDSA_SHA256, key, signature, payload);
  } catch {
    // Some runtimes throw on an r or s outside the curve order instead of answering false.
    return false;
  }
}

describe('Property 1: Signature round trip', () => {
  it('Feature: HR-module, Property 1: Signature round trip — a fresh P-256 key verifies its own signature over the canonical punch bytes', async () => {
    await fc.assert(
      fc.asyncProperty(punchFields, async (fields) => {
        const { privateKey, publicKey } = await freshKeyPair();
        const payload = canonicalPunchPayload(fields);
        const signature = new Uint8Array(await subtle.sign(ECDSA_SHA256, privateKey, payload));
        expect(await verify(publicKey, payload, signature)).toBe(true);
        // The signature covers the exact bytes: the oracle's bytes verify too.
        expect(await verify(publicKey, oraclePunchPayload(fields), signature)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 1: Signature round trip — changing any single field, any signature byte or the key fails verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        punchFields,
        punchFields,
        punchKey,
        fc.nat({ max: 63 }),
        fc.integer({ min: 1, max: 255 }),
        async (fields, other, key, byteIndex, xorMask) => {
          fc.pre(fields[key] !== other[key]);
          const { privateKey, publicKey } = await freshKeyPair();
          const payload = canonicalPunchPayload(fields);
          const signature = new Uint8Array(await subtle.sign(ECDSA_SHA256, privateKey, payload));
          expect(signature).toHaveLength(64);

          const tampered = canonicalPunchPayload({
            ...fields,
            [key]: other[key],
          } as AppPunchFields);
          expect(await verify(publicKey, tampered, signature)).toBe(false);

          const flipped = new Uint8Array(signature);
          flipped[byteIndex] ^= xorMask;
          expect(await verify(publicKey, payload, flipped)).toBe(false);

          const stranger = await freshKeyPair();
          expect(await verify(stranger.publicKey, payload, signature)).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 1: Signature round trip — the TypeScript canonical bytes equal an independent oracle of the design format', () => {
    fc.assert(
      fc.property(punchFields, (fields) => {
        const bytes = canonicalPunchPayload(fields);
        expect(bytesToHex(bytes)).toBe(bytesToHex(oraclePunchPayload(fields)));
        expect(new TextDecoder().decode(bytes)).toBe(canonicalPunchPayloadText(fields));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 1: Signature round trip — oracle and builder both match the Java fixture (R5.12)', () => {
    expect(fixture.punches.length).toBeGreaterThan(0);
    for (const c of fixture.punches) {
      expect(bytesToHex(oraclePunchPayload(c.input))).toBe(c.canonicalHex);
      expect(bytesToHex(canonicalPunchPayload(c.input))).toBe(c.canonicalHex);
    }
  });
});

// --- Property 20 ---

const COORDINATE_WORDS = /lat|lng|latitude|longitude/i;

const pathChars = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.'];
const segment = fc
  .array(fc.constantFrom(...pathChars), { minLength: 1, maxLength: 12 })
  .map((a) => a.join(''));
const path = fc.array(segment, { minLength: 1, maxLength: 5 }).map((s) => `/${s.join('/')}`);
const queryChars = [...pathChars, '=', '&', '%', '+'];
const query = fc
  .array(fc.constantFrom(...queryChars), { minLength: 0, maxLength: 40 })
  .map((a) => a.join(''));
const body = fc.oneof(
  fc.constant(null),
  fc.uint8Array({ maxLength: 200 }),
  fc.string({ maxLength: 200 }),
  fc.string({ unit: 'grapheme', maxLength: 60 }),
);

const envelopeFields: fc.Arbitrary<RequestEnvelopeFields> = fc.record({
  pairingId: objectId,
  method: fc.constantFrom('GET', 'POST'),
  path,
  query,
  timestamp: fc.integer({ min: 0, max: 2 ** 40 }),
  nonce: uuid,
  body,
});

const ENVELOPE_KEYS = [
  'pairingId',
  'method',
  'path',
  'query',
  'timestamp',
  'nonce',
  'bodySha256',
] as const;

/** `key=value` lines split on the first `=` only (the query value may itself contain `=`). */
function keyValue(line: string): [string, string] {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1)];
}

function bodyAsBytes(b: RequestEnvelopeFields['body']): Uint8Array {
  if (b == null) return new Uint8Array(0);
  return typeof b === 'string' ? new TextEncoder().encode(b) : b;
}

/** A coordinate pair as a phone would hold it, with a fractional part so the text is unmistakable. */
const coordinate = fc
  .double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })
  .map((d) => d.toFixed(6));

describe('Property 20: The punch payload never carries coordinates', () => {
  it('Feature: HR-module, Property 20: The punch payload never carries coordinates — exactly ten key= lines from the fixed set, no coordinate word or value', () => {
    fc.assert(
      fc.property(punchFields, coordinate, coordinate, (fields, lat, lng) => {
        const text = canonicalPunchPayloadText(fields);
        const lines = text.split('\n');
        expect(lines[0]).toBe(PUNCH_PAYLOAD_VERSION);
        const keyed = lines.slice(1);
        expect(keyed).toHaveLength(10);
        expect(keyed.map((l) => keyValue(l)[0])).toEqual([...PUNCH_KEYS]);
        for (const line of keyed) expect(line.indexOf('=')).toBeGreaterThan(0);
        expect(text).not.toMatch(COORDINATE_WORDS);
        expect(text).not.toContain(lat);
        expect(text).not.toContain(lng);
        expect(text).not.toContain('.');
        expect(text.endsWith('\n')).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 20: The punch payload never carries coordinates — the request envelope has exactly its declared lines and an independent body digest', async () => {
    await fc.assert(
      fc.asyncProperty(envelopeFields, async (fields) => {
        const text = await canonicalRequestEnvelopeText(fields);
        const lines = text.split('\n');
        expect(lines[0]).toBe(REQUEST_ENVELOPE_VERSION);
        const keyed = lines.slice(1).map(keyValue);
        expect(keyed.map(([k]) => k)).toEqual([...ENVELOPE_KEYS]);
        const values = Object.fromEntries(keyed) as Record<(typeof ENVELOPE_KEYS)[number], string>;
        expect(values.pairingId).toBe(fields.pairingId);
        expect(values.method).toBe(fields.method);
        expect(values.path).toBe(fields.path);
        expect(values.query).toBe(fields.query ?? '');
        expect(values.timestamp).toBe(String(fields.timestamp));
        expect(values.nonce).toBe(fields.nonce);
        expect(values.bodySha256).toBe(
          createHash('sha256').update(bodyAsBytes(fields.body)).digest('hex'),
        );
        expect(text.endsWith('\n')).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
