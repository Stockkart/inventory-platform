/**
 * The Attendance app's HTTP client for `/api/v1/hr/attendance-app/**` (design "Attendance app"
 * table, `appClient`). Plain `fetch`, no axios, no `localStorage`, no Bearer token: identity is
 * the pairing, proved by a signed request envelope (R9.8).
 *
 * Transport rules:
 *
 * - HTTPS only (R9.7). The constructor refuses a base URL that is not `https://`. Certificate
 *   trust is the operating system's: a TLS failure surfaces from `fetch` as a connection error,
 *   so no request is sent and the caller keeps its queue.
 * - "Not reachable" (R6.1): no answer within 10 s, a connection or TLS error, a 5xx, or an answer
 *   that is not the API envelope. Thrown as {@link NotReachable}; the offline queue retries these.
 * - A refusal is an answer, not "not reachable": a 4xx carrying the API error envelope. Thrown as
 *   {@link ServerRefusal} with the server's `data.message` word for word (design "Server-side
 *   rules", ER2) and, where it can be told, the `ErrorCode` name.
 *
 * Envelope (design "Canonical payloads", server `AttendanceAppAuthInterceptor`): every signed call
 * carries `X-Pairing-Id`, `X-Request-Timestamp` (epoch seconds, within ±10 min of server time),
 * `X-Request-Nonce` (UUID v4) and `X-Request-Signature` (Base64 DER ECDSA by the device key) over
 * `canonicalRequestEnvelope(method, path, raw query, timestamp, nonce, exact body bytes)`. The
 * `path` is the request URI the server sees, so the base URL's own path (`/api/v1`) is part of it.
 * Every response carries `X-Server-Time`; the client keeps the offset to the phone's clock and
 * applies it to envelope timestamps only, never to punch times (R4.4, R6.9).
 *
 * The three pairing calls and the latest-consent read are unsigned (the phone has no keys yet;
 * the consent text holds no shop data), matching `AttendanceAppAuthInterceptor.UNSIGNED_PATHS`.
 *
 * Pure: no Expo or React Native import. The composition root passes `fetch`, the signer, the
 * pairing id source and (on the phone) `expo-crypto` digests through {@link AppClientDeps}; see
 * `./expoCrypto.ts`.
 */
import {
  SERVER_MESSAGES,
  canonicalRequestEnvelope,
  refusalText,
} from '@inventory-platform/attendance-protocol';
import type {
  AbandonPairingRequest,
  AbandonPairingResponse,
  AppErrorCode,
  AppPunchRequest,
  AppPunchResponse,
  AppStatusResponse,
  ClaimPairingRequest,
  ClaimPairingResponse,
  CompletePairingRequest,
  ConsentResponse,
  ConsentVersion,
  PairingBootstrap,
  PunchResponse,
  Sha256,
  UnpairResponse,
} from '@inventory-platform/attendance-protocol';
import type { ApiResponse } from '@inventory-platform/contracts';

/**
 * The part of `BiometricSigner` (`src/signer/BiometricSigner.ts`, task 12.2) this client needs:
 * the device key, no biometric prompt. `BiometricSigner.signRequest` resolves with the DER
 * signature bytes; the client Base64-encodes them for the header. A signer that already returns
 * Base64 text is accepted too. Declared structurally so `BiometricSigner` satisfies it as is and
 * tests can pass a WebCrypto stand-in.
 */
export interface RequestSigner {
  /** DER `ECDSA-Sig-Value` over `bytes` (or its Base64 text), made with the device key. */
  signRequest(bytes: Uint8Array): Promise<Uint8Array | string>;
}

/** `fetch` as the client uses it; injected so tests and the phone can differ. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface AppClientDeps {
  /** `https://host[/base-path]`, e.g. `https://api.example.in/api/v1`. Anything else throws. */
  baseUrl: string;
  signer: RequestSigner;
  /** The current pairing id, or null when not paired (then a signed call throws {@link NoPairing}). */
  pairingId: () => Promise<string | null>;
  fetch?: FetchLike;
  /** SHA-256 for the envelope's `bodySha256`; defaults to `crypto.subtle` when the runtime has it. */
  sha256?: Sha256;
  /** Nonce source; defaults to `crypto.randomUUID` when the runtime has it. */
  randomUUID?: () => string;
  /** Phone clock in epoch milliseconds; defaults to `Date.now`. */
  now?: () => number;
  /** R6.1: "no answer" after this many milliseconds. */
  timeoutMs?: number;
}

/** Header names, identical to `AttendanceAppAuthInterceptor`. */
export const HEADER_PAIRING_ID = 'X-Pairing-Id';
export const HEADER_TIMESTAMP = 'X-Request-Timestamp';
export const HEADER_NONCE = 'X-Request-Nonce';
export const HEADER_SIGNATURE = 'X-Request-Signature';
export const HEADER_SERVER_TIME = 'X-Server-Time';

/** R6.1: the server counts as not reachable after this long without an answer. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Routes under the base URL; the full request path is `basePath + route`. */
export const ROUTES = {
  claim: '/hr/attendance-app/pairings/claim',
  complete: '/hr/attendance-app/pairings/complete',
  abandon: '/hr/attendance-app/pairings/abandon',
  latestConsent: '/hr/attendance-app/consent/latest',
  me: '/hr/attendance-app/me',
  punches: '/hr/attendance-app/punches',
  consent: '/hr/attendance-app/consent',
  unpairMe: '/hr/attendance-app/pairings/me/unpair',
} as const;

// --- outcomes ---

/** Why the server counted as not reachable (R6.1). */
export type NotReachableReason =
  /** No answer within the timeout. */
  | 'TIMEOUT'
  /** `fetch` rejected: no network, DNS, TLS not trusted, connection reset. */
  | 'CONNECTION'
  /** A 5xx response: the server answered but not with a result; retried like a timeout. */
  | 'SERVER_ERROR'
  /** A response that is not the API envelope (a proxy page, truncated JSON). */
  | 'BAD_ANSWER';

/** The server was not reachable (R6.1). The caller keeps its queue and retries later. */
export class NotReachable extends Error {
  readonly kind = 'not_reachable' as const;
  readonly reason: NotReachableReason;
  readonly status: number | undefined;

  constructor(reason: NotReachableReason, status?: number, cause?: unknown) {
    super(`server not reachable (${reason}${status ? ` ${status}` : ''})`);
    this.name = 'NotReachable';
    this.reason = reason;
    this.status = status;
    this.cause = cause;
  }
}

/**
 * The server answered with a refusal (a 4xx carrying the API error envelope). `message` is what
 * the app shows: the server's text word for word, with the R7.10 line added for
 * `HR_APP_NOT_PAIRED` (`refusalText`). `code` is the `ErrorCode` name when it can be told from
 * the text or status (the envelope itself carries no code name); `serverMessage` is the raw text.
 */
export class ServerRefusal extends Error {
  readonly kind = 'refusal' as const;
  readonly status: number;
  readonly code: AppErrorCode | undefined;
  readonly serverMessage: string;

  constructor(status: number, serverMessage: string) {
    const code = inferErrorCode(status, serverMessage);
    super(refusalText(code ?? '', serverMessage));
    this.name = 'ServerRefusal';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }

  /** R3.2–R3.3: the pairing is gone; the app must wipe and show the pairing screen. */
  get notPaired(): boolean {
    return this.code === 'HR_APP_NOT_PAIRED';
  }
}

/** A signed call was attempted while the phone is not paired. Nothing was sent. */
export class NoPairing extends Error {
  readonly kind = 'no_pairing' as const;

  constructor() {
    super('this phone is not paired');
    this.name = 'NoPairing';
  }
}

export function isNotReachable(error: unknown): error is NotReachable {
  return error instanceof NotReachable;
}

export function isServerRefusal(error: unknown): error is ServerRefusal {
  return error instanceof ServerRefusal;
}

// --- client ---

export class AppClient {
  private readonly origin: string;
  private readonly basePath: string;
  private readonly fetchImpl: FetchLike;
  private readonly signer: RequestSigner;
  private readonly pairingId: () => Promise<string | null>;
  private readonly sha256: Sha256 | undefined;
  private readonly randomUUID: () => string;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  /** Server clock minus phone clock, whole seconds, from the last `X-Server-Time` seen. */
  private offsetSeconds = 0;
  private offsetKnown = false;

  constructor(deps: AppClientDeps) {
    const base = parseHttpsBase(deps.baseUrl);
    this.origin = base.origin;
    this.basePath = base.basePath;
    this.fetchImpl = deps.fetch ?? defaultFetch();
    this.signer = deps.signer;
    this.pairingId = deps.pairingId;
    this.sha256 = deps.sha256;
    this.randomUUID = deps.randomUUID ?? defaultRandomUUID;
    this.now = deps.now ?? Date.now;
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Server clock minus phone clock in seconds; 0 until the first answer. Envelope use only. */
  get serverOffsetSeconds(): number {
    return this.offsetSeconds;
  }

  /** True once an `X-Server-Time` header has been seen. */
  get hasServerTime(): boolean {
    return this.offsetKnown;
  }

  /** The phone's clock corrected by the server offset, in epoch seconds. */
  serverNowSeconds(): number {
    return Math.floor(this.now() / 1000) + this.offsetSeconds;
  }

  // ---- unsigned pairing handshake (R2.6–R2.9) ----

  claim(request: ClaimPairingRequest): Promise<ClaimPairingResponse> {
    return this.unsigned<ClaimPairingResponse>('POST', ROUTES.claim, request);
  }

  complete(request: CompletePairingRequest): Promise<PairingBootstrap> {
    return this.unsigned<PairingBootstrap>('POST', ROUTES.complete, request);
  }

  abandon(request: AbandonPairingRequest): Promise<AbandonPairingResponse> {
    return this.unsigned<AbandonPairingResponse>('POST', ROUTES.abandon, request);
  }

  /** The newest consent text (R9.12); no shop data, no signature. */
  getLatestConsent(): Promise<ConsentVersion> {
    return this.unsigned<ConsentVersion>('GET', ROUTES.latestConsent);
  }

  // ---- signed calls ----

  /** The home screen's data (R4.1). */
  getMe(): Promise<AppStatusResponse> {
    return this.signed<AppStatusResponse>('GET', ROUTES.me);
  }

  /** One punch, online or queued (R4.2c, R6.5). */
  postPunch(request: AppPunchRequest): Promise<AppPunchResponse> {
    return this.signed<AppPunchResponse>('POST', ROUTES.punches, { body: request });
  }

  /** The worker's own punches with a day in `[from, to]`, both `yyyy-MM-dd` (R4.10). */
  async getPunches(from: string, to: string): Promise<PunchResponse[]> {
    requireDate(from, 'from');
    requireDate(to, 'to');
    const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return this.signed<PunchResponse[]>('GET', ROUTES.punches, { query });
  }

  /** "I agree" on a newer consent version (R9.13). */
  postConsent(version: number): Promise<ConsentResponse> {
    return this.signed<ConsentResponse>('POST', ROUTES.consent, { body: { version } });
  }

  /** "Remove this phone" (R3.7). Needs the server; a {@link NotReachable} means still paired. */
  unpairMe(): Promise<UnpairResponse> {
    return this.signed<UnpairResponse>('POST', ROUTES.unpairMe);
  }

  // ---- transport ----

  private async unsigned<T>(method: 'GET' | 'POST', route: string, body?: unknown): Promise<T> {
    const bodyText = body === undefined ? undefined : JSON.stringify(body);
    return this.send<T>(method, this.basePath + route, '', bodyText, {});
  }

  private async signed<T>(
    method: 'GET' | 'POST',
    route: string,
    options: { query?: string; body?: unknown } = {},
  ): Promise<T> {
    const pairingId = await this.pairingId();
    if (pairingId == null) {
      throw new NoPairing();
    }
    const path = this.basePath + route;
    const query = options.query ?? '';
    const bodyText = options.body === undefined ? undefined : JSON.stringify(options.body);
    const timestamp = this.serverNowSeconds();
    const nonce = this.randomUUID().toLowerCase();
    const envelope = await canonicalRequestEnvelope(
      { pairingId, method, path, query, timestamp, nonce, body: bodyText },
      this.sha256 ? { sha256: this.sha256 } : {},
    );
    // The signer's own errors (KEY_INVALIDATED, NO_KEYS and the like) pass through untouched.
    const signed = await this.signer.signRequest(envelope);
    const signature = typeof signed === 'string' ? signed : bytesToBase64(signed);
    return this.send<T>(method, path, query, bodyText, {
      [HEADER_PAIRING_ID]: pairingId,
      [HEADER_TIMESTAMP]: String(timestamp),
      [HEADER_NONCE]: nonce,
      [HEADER_SIGNATURE]: signature,
    });
  }

  private async send<T>(
    method: 'GET' | 'POST',
    path: string,
    query: string,
    bodyText: string | undefined,
    extraHeaders: Record<string, string>,
  ): Promise<T> {
    const url = `${this.origin}${path}${query ? `?${query}` : ''}`;
    const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
    if (bodyText !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: bodyText,
        signal: controller.signal,
      });
    } catch (error) {
      throw new NotReachable(isAbort(error) ? 'TIMEOUT' : 'CONNECTION', undefined, error);
    } finally {
      clearTimeout(timer);
    }

    this.readServerTime(response);

    if (response.status >= 500) {
      throw new NotReachable('SERVER_ERROR', response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new NotReachable('BAD_ANSWER', response.status, error);
    }

    if (response.ok) {
      if (!isEnvelope(payload) || payload.success !== true) {
        throw new NotReachable('BAD_ANSWER', response.status);
      }
      return payload.data as T;
    }

    const message = errorMessage(payload);
    if (message == null) {
      throw new NotReachable('BAD_ANSWER', response.status);
    }
    throw new ServerRefusal(response.status, message);
  }

  private readServerTime(response: Response): void {
    const header = response.headers.get(HEADER_SERVER_TIME);
    if (header == null) {
      return;
    }
    const serverSeconds = Number(header.trim());
    if (!Number.isSafeInteger(serverSeconds)) {
      return;
    }
    this.offsetSeconds = serverSeconds - Math.floor(this.now() / 1000);
    this.offsetKnown = true;
  }
}

// --- helpers ---

const HTTPS_BASE = /^https:\/\/([^\s/?#]+)(\/[^\s?#]*)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Splits `https://host[:port][/base]` into origin and base path; refuses anything else (R9.7). */
export function parseHttpsBase(baseUrl: string): { origin: string; basePath: string } {
  const match = HTTPS_BASE.exec((baseUrl ?? '').trim());
  if (!match) {
    throw new Error(
      `The Attendance app only talks to an https:// API URL without query or fragment, got ${JSON.stringify(
        baseUrl,
      )}.`,
    );
  }
  return { origin: `https://${match[1]}`, basePath: (match[2] ?? '').replace(/\/+$/, '') };
}

/**
 * The `ErrorCode` name behind a refusal, when it can be told. The API error envelope carries the
 * text and the HTTP status but no code name, so: exact text match first (`SERVER_MESSAGES`), the
 * one templated text next, then the statuses only one code produces on these paths (403 is
 * `HR_APP_NOT_PAIRED`; 429 without a matching text is `HR_TOO_MANY_ATTEMPTS`).
 */
export function inferErrorCode(status: number, message: string): AppErrorCode | undefined {
  const text = message.trim();
  for (const [code, known] of Object.entries(SERVER_MESSAGES) as [AppErrorCode, string][]) {
    if (known === text) {
      return code;
    }
  }
  if (text.startsWith('Too many wrong codes.')) {
    return 'HR_PAIRING_CODE_LOCKED';
  }
  if (status === 403) {
    return 'HR_APP_NOT_PAIRED';
  }
  if (status === 429) {
    return 'HR_TOO_MANY_ATTEMPTS';
  }
  return undefined;
}

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

/** `data.message`, then `error`, then `message` (the shared web client's order); null when none. */
function errorMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const p = payload as { data?: unknown; error?: unknown; message?: unknown };
  const data = p.data as { message?: unknown } | undefined;
  for (const candidate of [data?.message, p.error, p.message]) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function requireDate(value: string, field: string): void {
  if (typeof value !== 'string' || !DATE.test(value)) {
    throw new Error(`${field} must be yyyy-MM-dd`);
  }
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Standard Base64 with padding, as `java.util.Base64.getDecoder()` reads it. Written out rather
 * than taken from `btoa`/`Buffer` so it runs the same on Hermes and node.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64[triple & 63] : '=';
  }
  return out;
}

function defaultFetch(): FetchLike {
  const f = (globalThis as { fetch?: typeof fetch }).fetch;
  if (!f) {
    throw new Error('fetch is not available on this runtime; pass one in AppClientDeps');
  }
  return (input, init) => f(input, init);
}

function defaultRandomUUID(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!c?.randomUUID) {
    throw new Error(
      'crypto.randomUUID is not available on this runtime; pass one in AppClientDeps',
    );
  }
  return c.randomUUID();
}
