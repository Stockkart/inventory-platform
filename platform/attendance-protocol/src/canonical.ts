/**
 * Canonical payloads for the Attendance app (design DD3), byte-identical to the Java
 * `com.inventory.hr.utils.AppSignatures` builders. Both payloads are a fixed-order `key=value`
 * line protocol: UTF-8, lines joined with `\n`, no trailing newline. The phone signs these bytes
 * (punch key for the punch payload, device key for the request envelope); the server rebuilds the
 * same bytes from the parsed request and verifies the signature. The shared fixture
 * `fixtures/canonical.json` keeps the two builders in step.
 *
 * Privacy (R9.2): the punch payload has no field for coordinates. It carries the distance from the
 * shop and the accuracy, both whole metres, and the mock flag.
 *
 * Runtime-agnostic: no Node, DOM or React Native API is imported. SHA-256 uses `crypto.subtle`
 * when the runtime has it (Node 20+, browsers); otherwise pass a digest function (for example
 * `expo-crypto`'s `digest`) through {@link EnvelopeOptions.sha256}.
 */
import type { AppPunchFields } from './types.js';

/** First line of a punch payload, signed by the biometric-gated punch key. */
export const PUNCH_PAYLOAD_VERSION = 'SKAT-PUNCH-1';

/** First line of a request envelope, signed by the device key. */
export const REQUEST_ENVELOPE_VERSION = 'SKAT-REQ-1';

/** Field value used when a metres field has no value. */
export const NO_VALUE = '-';

/** Largest metres value the Java side accepts (`Integer.MAX_VALUE`). */
const MAX_METRES = 2_147_483_647;

const OBJECT_ID = /^[0-9a-f]{24}$/;
const UUID_LOWER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PHONE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const LINE_BREAK = /[\r\n]/;

const utf8 = new TextEncoder();

/** The fields of a request envelope, in payload order (Java `AppSignatures.EnvelopeFields`). */
export interface RequestEnvelopeFields {
  /** 24 lowercase hex characters. */
  pairingId: string;
  method: 'GET' | 'POST';
  /** Request path without the query string, starting with `/`. */
  path: string;
  /** Raw query string without the leading `?`; empty, null or undefined when none. */
  query?: string | null;
  /** Epoch seconds as sent in `X-Request-Timestamp`. */
  timestamp: number;
  /** UUID as sent in `X-Request-Nonce`, lowercase. */
  nonce: string;
  /** The exact body bytes, or the body string (UTF-8 encoded, as `fetch` sends it); empty when none. */
  body?: Uint8Array | string | null;
}

/** SHA-256 over bytes, returning the 32-byte digest. */
export type Sha256 = (bytes: Uint8Array) => Promise<ArrayBuffer | Uint8Array>;

export interface EnvelopeOptions {
  /** Digest to use instead of `crypto.subtle` (needed on runtimes without WebCrypto). */
  sha256?: Sha256;
}

/** The canonical punch payload bytes that the punch key signs. Throws on a malformed field. */
export function canonicalPunchPayload(f: AppPunchFields): Uint8Array {
  return utf8.encode(canonicalPunchPayloadText(f));
}

/** The canonical punch payload as text; {@link canonicalPunchPayload} is its UTF-8 bytes. */
export function canonicalPunchPayloadText(f: AppPunchFields): string {
  requireObjectId(f.pairingId, 'pairingId');
  requireObjectId(f.shopId, 'shopId');
  requireObjectId(f.employeeId, 'employeeId');
  requireUuid(f.punchId, 'punchId');
  requirePhoneTime(f.phoneTime);
  return [
    PUNCH_PAYLOAD_VERSION,
    `pairingId=${f.pairingId}`,
    `shopId=${f.shopId}`,
    `employeeId=${f.employeeId}`,
    `punchId=${f.punchId}`,
    `phoneTime=${f.phoneTime}`,
    `offline=${bit(f.offline)}`,
    `locationChecked=${bit(f.locationChecked)}`,
    `distanceMetres=${metres(f.distanceMetres, 'distanceMetres')}`,
    `accuracyMetres=${metres(f.accuracyMetres, 'accuracyMetres')}`,
    `mock=${bit(f.mock)}`,
  ].join('\n');
}

/** The canonical request envelope bytes that the device key signs. Throws on a malformed field. */
export async function canonicalRequestEnvelope(
  f: RequestEnvelopeFields,
  options: EnvelopeOptions = {},
): Promise<Uint8Array> {
  return utf8.encode(await canonicalRequestEnvelopeText(f, options));
}

/** The canonical request envelope as text; {@link canonicalRequestEnvelope} is its UTF-8 bytes. */
export async function canonicalRequestEnvelopeText(
  f: RequestEnvelopeFields,
  options: EnvelopeOptions = {},
): Promise<string> {
  requireObjectId(f.pairingId, 'pairingId');
  if (f.method !== 'GET' && f.method !== 'POST') {
    throw new Error('method must be GET or POST');
  }
  if (typeof f.path !== 'string' || !f.path.startsWith('/') || f.path.includes('?')) {
    throw new Error('path must start with / and carry no query string');
  }
  requireSingleLine(f.path, 'path');
  const query = f.query ?? '';
  requireSingleLine(query, 'query');
  if (!Number.isSafeInteger(f.timestamp)) {
    throw new Error('timestamp must be whole epoch seconds');
  }
  requireUuid(f.nonce, 'nonce');
  const body = bodyBytes(f.body);
  const bodySha256 = await sha256Hex(body, options.sha256);
  return [
    REQUEST_ENVELOPE_VERSION,
    `pairingId=${f.pairingId}`,
    `method=${f.method}`,
    `path=${f.path}`,
    `query=${query}`,
    `timestamp=${f.timestamp}`,
    `nonce=${f.nonce}`,
    `bodySha256=${bodySha256}`,
  ].join('\n');
}

/** Lowercase hex SHA-256 of the bytes (Java `AppSignatures.sha256Hex`). */
export async function sha256Hex(bytes: Uint8Array, sha256: Sha256 = subtleSha256): Promise<string> {
  const digest = await sha256(bytes);
  return bytesToHex(digest instanceof Uint8Array ? digest : new Uint8Array(digest));
}

/** UTF-8 bytes of a string. */
export function utf8Bytes(text: string): Uint8Array {
  return utf8.encode(text);
}

/** Lowercase hex of bytes. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

/** Bytes of a hex string (either case; must have an even number of hex digits). */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('hex must have an even number of hex digits');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * A `Date` as the punch payload's `phoneTime`: UTC, whole seconds (fraction dropped),
 * `yyyy-MM-ddTHH:mm:ssZ`.
 */
export function formatPhoneTime(at: Date): string {
  if (Number.isNaN(at.getTime())) {
    throw new Error('phoneTime must be a valid date');
  }
  return `${at.toISOString().slice(0, 19)}Z`;
}

/** True when `value` is a `phoneTime` the payload accepts: `yyyy-MM-ddTHH:mm:ssZ` and a real instant. */
export function isPhoneTime(value: string): boolean {
  if (!PHONE_TIME.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && formatPhoneTime(parsed) === value;
}

// --- helpers ---

interface SubtleDigest {
  digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer>;
}

function subtleSha256(bytes: Uint8Array): Promise<ArrayBuffer> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleDigest } }).crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'crypto.subtle is not available on this runtime; pass a sha256 digest in the options',
    );
  }
  return subtle.digest('SHA-256', bytes);
}

function bodyBytes(body: RequestEnvelopeFields['body']): Uint8Array {
  if (body == null) {
    return new Uint8Array(0);
  }
  return typeof body === 'string' ? utf8.encode(body) : body;
}

function bit(b: boolean): string {
  return b ? '1' : '0';
}

function metres(value: number | null | undefined, field: string): string {
  if (value == null) {
    return NO_VALUE;
  }
  if (!Number.isInteger(value) || value < 0 || value > MAX_METRES) {
    throw new Error(`${field} must be a whole number of metres from 0 to ${MAX_METRES}`);
  }
  return String(value);
}

function requireObjectId(value: string, field: string): void {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) {
    throw new Error(`${field} must be 24 lowercase hex characters`);
  }
}

function requireUuid(value: string, field: string): void {
  if (typeof value !== 'string' || !UUID_LOWER.test(value)) {
    throw new Error(`${field} must be a lowercase UUID with hyphens`);
  }
}

function requirePhoneTime(value: string): void {
  if (typeof value !== 'string' || !isPhoneTime(value)) {
    throw new Error('phoneTime must be yyyy-MM-ddTHH:mm:ssZ in UTC, whole seconds');
  }
}

function requireSingleLine(value: string, field: string): void {
  if (LINE_BREAK.test(value)) {
    throw new Error(`${field} must not contain line breaks`);
  }
}
