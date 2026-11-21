import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ASK_MANAGER_TO_MARK,
  SERVER_MESSAGES,
  canonicalRequestEnvelope,
} from '@inventory-platform/attendance-protocol';
import type { AppPunchRequest, ClaimPairingRequest } from '@inventory-platform/attendance-protocol';

import {
  AppClient,
  HEADER_NONCE,
  HEADER_PAIRING_ID,
  HEADER_SERVER_TIME,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
  NoPairing,
  NotReachable,
  ServerRefusal,
  bytesToBase64,
  inferErrorCode,
  isNotReachable,
  isServerRefusal,
  parseHttpsBase,
  type FetchLike,
  type RequestSigner,
} from './appClient';

const subtle = webcrypto.subtle;
const PAIRING_ID = '66f1a2b3c4d5e6f708192a3b';
const BASE = 'https://api.example.in/api/v1';
const NONCE = '0f8fad5b-d9cb-469f-a165-70867728950e';
const PHONE_NOW_MS = Date.UTC(2025, 3, 3, 9, 12, 0, 500); // 2025-04-03T09:12:00.500Z
const PHONE_NOW_S = Math.floor(PHONE_NOW_MS / 1000);

/**
 * A device key pair in WebCrypto. Like `BiometricSigner.signRequest`, it resolves with signature
 * bytes (WebCrypto gives raw r‖s rather than DER; the client treats them as opaque either way).
 */
async function makeSigner(): Promise<{
  signer: RequestSigner;
  publicKey: CryptoKey;
  calls: Uint8Array[];
}> {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const calls: Uint8Array[] = [];
  const signer: RequestSigner = {
    async signRequest(bytes) {
      calls.push(bytes);
      const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, bytes);
      return new Uint8Array(sig);
    },
  };
  return { signer, publicKey: pair.publicKey, calls };
}

function verify(publicKey: CryptoKey, payload: Uint8Array, signatureBase64: string) {
  return subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    Buffer.from(signatureBase64, 'base64'),
    payload,
  );
}

interface Captured {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

/** A `fetch` that records the request and answers from a queue of responses (or rejections). */
function fakeFetch(answers: Array<Response | Error | 'hang'>) {
  const captured: Captured[] = [];
  const fetch: FetchLike = (url, init) => {
    captured.push({ url, init, headers: { ...(init.headers as Record<string, string>) } });
    const answer = answers.shift();
    if (answer === undefined) {
      throw new Error('fakeFetch: no answer queued');
    }
    if (answer === 'hang') {
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      });
    }
    if (answer instanceof Error) {
      return Promise.reject(answer);
    }
    return Promise.resolve(answer);
  };
  return { fetch, captured };
}

function ok(data: unknown, serverTimeSeconds?: number): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (serverTimeSeconds !== undefined) {
    headers[HEADER_SERVER_TIME] = String(serverTimeSeconds);
  }
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers });
}

function refused(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, data: { message, status } }),
    { status, headers: { 'Content-Type': 'application/json', [HEADER_SERVER_TIME]: '1' } },
  );
}

const punch: AppPunchRequest = {
  pairingId: PAIRING_ID,
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  punchId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  phoneTime: '2025-04-03T09:12:00Z',
  offline: false,
  locationChecked: true,
  distanceMetres: 12,
  accuracyMetres: 8,
  mock: false,
  signature: 'MEUCIQ==',
};

describe('AppClient', () => {
  let signerKit: Awaited<ReturnType<typeof makeSigner>>;

  beforeEach(async () => {
    signerKit = await makeSigner();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function client(
    fetch: FetchLike,
    overrides: Partial<ConstructorParameters<typeof AppClient>[0]> = {},
  ) {
    return new AppClient({
      baseUrl: BASE,
      signer: signerKit.signer,
      pairingId: async () => PAIRING_ID,
      fetch,
      randomUUID: () => NONCE,
      now: () => PHONE_NOW_MS,
      ...overrides,
    });
  }

  describe('HTTPS only (R9.7)', () => {
    it.each([
      'http://api.example.in/api/v1',
      'HTTPS://api.example.in',
      'api.example.in/api/v1',
      'https://api.example.in/api/v1?x=1',
      'https://api.example.in/api/v1#frag',
      'https://',
      '',
    ])('refuses base URL %j at construction', (baseUrl) => {
      expect(() => client(fakeFetch([]).fetch, { baseUrl })).toThrow(/https:\/\//);
    });

    it('splits the base URL into origin and base path, dropping trailing slashes', () => {
      expect(parseHttpsBase('https://api.example.in/api/v1/')).toEqual({
        origin: 'https://api.example.in',
        basePath: '/api/v1',
      });
      expect(parseHttpsBase('https://api.example.in:8443')).toEqual({
        origin: 'https://api.example.in:8443',
        basePath: '',
      });
    });
  });

  describe('signed envelope (R9.8, design "Canonical payloads")', () => {
    it('POST /punches: headers are set and the signature is over the exact canonical bytes', async () => {
      const { fetch, captured } = fakeFetch([ok({ outcome: 'STORED' })]);
      const result = await client(fetch).postPunch(punch);

      expect(result).toEqual({ outcome: 'STORED' });
      expect(captured).toHaveLength(1);
      const { url, init, headers } = captured[0];
      expect(url).toBe('https://api.example.in/api/v1/hr/attendance-app/punches');
      expect(init.method).toBe('POST');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers[HEADER_PAIRING_ID]).toBe(PAIRING_ID);
      expect(headers[HEADER_TIMESTAMP]).toBe(String(PHONE_NOW_S));
      expect(headers[HEADER_NONCE]).toBe(NONCE);
      expect(init.body).toBe(JSON.stringify(punch));

      // Rebuild the envelope the way the server does, from what was actually sent.
      const expected = await canonicalRequestEnvelope({
        pairingId: headers[HEADER_PAIRING_ID],
        method: 'POST',
        path: '/api/v1/hr/attendance-app/punches',
        query: '',
        timestamp: Number(headers[HEADER_TIMESTAMP]),
        nonce: headers[HEADER_NONCE],
        body: init.body as string,
      });
      expect(signerKit.calls).toHaveLength(1);
      expect(Buffer.from(signerKit.calls[0])).toEqual(Buffer.from(expected));
      expect(await verify(signerKit.publicKey, expected, headers[HEADER_SIGNATURE])).toBe(true);
    });

    it('GET /punches?from&to: the raw query is signed, no body, no Content-Type', async () => {
      const { fetch, captured } = fakeFetch([ok([])]);
      await client(fetch).getPunches('2025-03-04', '2025-04-03');

      const { url, init, headers } = captured[0];
      expect(url).toBe(
        'https://api.example.in/api/v1/hr/attendance-app/punches?from=2025-03-04&to=2025-04-03',
      );
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
      expect(headers['Content-Type']).toBeUndefined();

      const expected = await canonicalRequestEnvelope({
        pairingId: PAIRING_ID,
        method: 'GET',
        path: '/api/v1/hr/attendance-app/punches',
        query: 'from=2025-03-04&to=2025-04-03',
        timestamp: PHONE_NOW_S,
        nonce: NONCE,
      });
      expect(await verify(signerKit.publicKey, expected, headers[HEADER_SIGNATURE])).toBe(true);
    });

    it('a tampered body no longer verifies against the sent signature', async () => {
      const { fetch, captured } = fakeFetch([ok({})]);
      await client(fetch).postConsent(2);
      const { headers } = captured[0];
      const tampered = await canonicalRequestEnvelope({
        pairingId: PAIRING_ID,
        method: 'POST',
        path: '/api/v1/hr/attendance-app/consent',
        query: '',
        timestamp: PHONE_NOW_S,
        nonce: NONCE,
        body: JSON.stringify({ version: 3 }),
      });
      expect(await verify(signerKit.publicKey, tampered, headers[HEADER_SIGNATURE])).toBe(false);
    });

    it('a signer that already returns Base64 text is sent as is', async () => {
      const { fetch, captured } = fakeFetch([ok({})]);
      const textSigner: RequestSigner = { signRequest: async () => 'c2lnbmVk' };
      await client(fetch, { signer: textSigner }).getMe();
      expect(captured[0].headers[HEADER_SIGNATURE]).toBe('c2lnbmVk');
    });

    it('uses an injected sha256 when given', async () => {
      const sha256 = vi.fn(async (bytes: Uint8Array) => subtle.digest('SHA-256', bytes));
      const { fetch } = fakeFetch([ok({})]);
      await client(fetch, { sha256 }).getMe();
      expect(sha256).toHaveBeenCalledTimes(1);
    });

    it('throws NoPairing and sends nothing when the phone is not paired', async () => {
      const { fetch, captured } = fakeFetch([ok({})]);
      await expect(client(fetch, { pairingId: async () => null }).getMe()).rejects.toBeInstanceOf(
        NoPairing,
      );
      expect(captured).toHaveLength(0);
      expect(signerKit.calls).toHaveLength(0);
    });

    it('lets the signer’s own error through untouched', async () => {
      const { fetch, captured } = fakeFetch([ok({})]);
      const failing: RequestSigner = {
        signRequest: async () => {
          throw new Error('KEY_INVALIDATED');
        },
      };
      await expect(client(fetch, { signer: failing }).getMe()).rejects.toThrow('KEY_INVALIDATED');
      expect(captured).toHaveLength(0);
    });
  });

  describe('server time offset (X-Server-Time)', () => {
    it('applies the offset of the last answer to the next envelope timestamp only', async () => {
      const serverNow = PHONE_NOW_S + 300; // phone is 5 minutes behind the server
      const { fetch, captured } = fakeFetch([ok({}, serverNow), ok({})]);
      const c = client(fetch);
      expect(c.hasServerTime).toBe(false);
      expect(c.serverOffsetSeconds).toBe(0);

      await c.getMe();
      expect(c.hasServerTime).toBe(true);
      expect(c.serverOffsetSeconds).toBe(300);
      expect(c.serverNowSeconds()).toBe(serverNow);

      await c.getMe();
      expect(captured[0].headers[HEADER_TIMESTAMP]).toBe(String(PHONE_NOW_S));
      expect(captured[1].headers[HEADER_TIMESTAMP]).toBe(String(serverNow));
    });

    it('reads the header from refusals and from unsigned calls too, ignoring a bad value', async () => {
      const c = client(fakeFetch([refused(409, SERVER_MESSAGES.HR_APP_OFF)]).fetch);
      await expect(c.getMe()).rejects.toBeInstanceOf(ServerRefusal);
      expect(c.serverOffsetSeconds).toBe(1 - PHONE_NOW_S);

      const c2 = client(fakeFetch([ok({ version: 1 }, PHONE_NOW_S - 7)]).fetch);
      await c2.getLatestConsent();
      expect(c2.serverOffsetSeconds).toBe(-7);

      const bad = new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { [HEADER_SERVER_TIME]: 'soon' },
      });
      const c3 = client(fakeFetch([bad]).fetch);
      await c3.getMe();
      expect(c3.hasServerTime).toBe(false);
    });
  });

  describe('unsigned pairing calls', () => {
    it('claim posts the JSON body with no envelope headers', async () => {
      const request: ClaimPairingRequest = {
        code: 'ABCDEFGH',
        installationId: '11111111-2222-4333-8444-555555555555',
        os: 'ANDROID',
        osVersion: '14',
        phoneModel: 'Redmi Note 11',
        appVersion: '1.0.0',
      };
      const answer = { claimToken: 't', shopName: 'S', employeeName: 'E', consent: { version: 1 } };
      const { fetch, captured } = fakeFetch([ok(answer)]);
      const result = await client(fetch, { pairingId: async () => null }).claim(request);

      expect(result).toEqual(answer);
      const { url, init, headers } = captured[0];
      expect(url).toBe('https://api.example.in/api/v1/hr/attendance-app/pairings/claim');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(request));
      expect(headers['Content-Type']).toBe('application/json');
      for (const h of [HEADER_PAIRING_ID, HEADER_TIMESTAMP, HEADER_NONCE, HEADER_SIGNATURE]) {
        expect(headers[h]).toBeUndefined();
      }
      expect(signerKit.calls).toHaveLength(0);
    });

    it('complete, abandon and the latest consent hit their routes', async () => {
      const { fetch, captured } = fakeFetch([ok({}), ok({ abandoned: true }), ok({ version: 2 })]);
      const c = client(fetch, { pairingId: async () => null });
      await c.complete({
        claimToken: 't',
        installationId: 'i',
        punchPublicKey: 'p',
        devicePublicKey: 'd',
        consentVersion: 1,
      });
      await c.abandon({ claimToken: 't' });
      expect(await c.getLatestConsent()).toEqual({ version: 2 });
      expect(captured.map((r) => `${r.init.method} ${r.url.slice(BASE.length)}`)).toEqual([
        'POST /hr/attendance-app/pairings/complete',
        'POST /hr/attendance-app/pairings/abandon',
        'GET /hr/attendance-app/consent/latest',
      ]);
    });

    it('unpairMe posts to its route with the envelope and no body', async () => {
      const { fetch, captured } = fakeFetch([ok({ unpaired: true })]);
      expect(await client(fetch).unpairMe()).toEqual({ unpaired: true });
      expect(captured[0].url).toBe(
        'https://api.example.in/api/v1/hr/attendance-app/pairings/me/unpair',
      );
      expect(captured[0].init.body).toBeUndefined();
      expect(captured[0].headers[HEADER_SIGNATURE]).toBeDefined();
    });
  });

  describe('not reachable (R6.1)', () => {
    // Fake timers: the digest and signer are plain promises here so the whole call runs on the
    // microtask queue and the 10 s timer is the only thing the fake clock has to fire.
    const instant = {
      signer: { signRequest: async () => 'c2ln' } satisfies RequestSigner,
      sha256: async () => new Uint8Array(32),
    };

    it('no answer within 10 s is a TIMEOUT', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(PHONE_NOW_MS);
      const { fetch, captured } = fakeFetch(['hang']);
      const pending = client(fetch, instant).getMe();
      const outcome = pending.then(
        () => 'resolved',
        (e: unknown) => e,
      );

      await vi.advanceTimersByTimeAsync(9_999);
      expect(captured).toHaveLength(1);
      expect(captured[0].init.signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);

      const error = await outcome;
      expect(error).toBeInstanceOf(NotReachable);
      expect((error as NotReachable).reason).toBe('TIMEOUT');
      expect(isNotReachable(error)).toBe(true);
    });

    it('a shorter injected timeout is honoured', async () => {
      vi.useFakeTimers();
      const { fetch } = fakeFetch(['hang']);
      const pending = client(fetch, { ...instant, timeoutMs: 500 })
        .getMe()
        .catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(500);
      expect(((await pending) as NotReachable).reason).toBe('TIMEOUT');
    });

    it('a rejected fetch (no network, TLS not trusted) is a CONNECTION error', async () => {
      const cause = new TypeError('Network request failed');
      const { fetch } = fakeFetch([cause]);
      const error = await client(fetch)
        .postPunch(punch)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NotReachable);
      expect((error as NotReachable).reason).toBe('CONNECTION');
      expect((error as NotReachable).cause).toBe(cause);
    });

    it.each([500, 502, 503])('a %i answer is SERVER_ERROR, not a refusal', async (status) => {
      const { fetch } = fakeFetch([new Response('busy', { status })]);
      const error = await client(fetch)
        .postPunch(punch)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NotReachable);
      expect((error as NotReachable).reason).toBe('SERVER_ERROR');
      expect((error as NotReachable).status).toBe(status);
      expect(isServerRefusal(error)).toBe(false);
    });

    it('an answer that is not the API envelope is BAD_ANSWER', async () => {
      const html = new Response('<html>proxy</html>', { status: 404 });
      const notEnvelope = new Response(JSON.stringify({ hello: 1 }), { status: 200 });
      const falseSuccess = new Response(JSON.stringify({ success: false }), { status: 200 });
      for (const answer of [html, notEnvelope, falseSuccess]) {
        const error = await client(fakeFetch([answer]).fetch)
          .getMe()
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(NotReachable);
        expect((error as NotReachable).reason).toBe('BAD_ANSWER');
      }
    });
  });

  describe('refusals (an answer, R6.1; message word for word, ER2)', () => {
    it('a 4xx with the error envelope is a ServerRefusal carrying data.message', async () => {
      const { fetch } = fakeFetch([refused(422, SERVER_MESSAGES.HR_APP_TOO_LATE)]);
      const error = await client(fetch)
        .postPunch(punch)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ServerRefusal);
      const refusal = error as ServerRefusal;
      expect(refusal.status).toBe(422);
      expect(refusal.message).toBe(SERVER_MESSAGES.HR_APP_TOO_LATE);
      expect(refusal.serverMessage).toBe(SERVER_MESSAGES.HR_APP_TOO_LATE);
      expect(refusal.code).toBe('HR_APP_TOO_LATE');
      expect(refusal.notPaired).toBe(false);
      expect(isServerRefusal(error)).toBe(true);
    });

    it('403 is HR_APP_NOT_PAIRED: the app adds the R7.10 line and knows to wipe (R3.2)', async () => {
      const { fetch } = fakeFetch([refused(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED)]);
      const refusal = (await client(fetch)
        .getMe()
        .catch((e: unknown) => e)) as ServerRefusal;
      expect(refusal.code).toBe('HR_APP_NOT_PAIRED');
      expect(refusal.notPaired).toBe(true);
      expect(refusal.serverMessage).toBe('This phone is no longer paired. Ask your manager.');
      expect(refusal.message).toBe(
        `This phone is no longer paired. Ask your manager.\n${ASK_MANAGER_TO_MARK}`,
      );
    });

    it('a text the app does not know is still shown word for word, with no code', async () => {
      const { fetch } = fakeFetch([refused(400, 'phoneTime must be yyyy-MM-ddTHH:mm:ssZ')]);
      const refusal = (await client(fetch)
        .postPunch(punch)
        .catch((e: unknown) => e)) as ServerRefusal;
      expect(refusal.message).toBe('phoneTime must be yyyy-MM-ddTHH:mm:ssZ');
      expect(refusal.code).toBeUndefined();
    });

    it('falls back to error, then message, when data.message is missing', async () => {
      const onlyError = new Response(JSON.stringify({ success: false, error: 'E' }), {
        status: 409,
      });
      const onlyMessage = new Response(JSON.stringify({ success: false, message: 'M' }), {
        status: 409,
      });
      expect(
        (
          (await client(fakeFetch([onlyError]).fetch)
            .getMe()
            .catch((e: unknown) => e)) as ServerRefusal
        ).message,
      ).toBe('E');
      expect(
        (
          (await client(fakeFetch([onlyMessage]).fetch)
            .getMe()
            .catch((e: unknown) => e)) as ServerRefusal
        ).message,
      ).toBe('M');
    });
  });

  describe('inferErrorCode', () => {
    it('matches every known server text to its code', () => {
      for (const [code, text] of Object.entries(SERVER_MESSAGES)) {
        if (code === 'HR_PAIRING_CODE_LOCKED') {
          continue;
        }
        expect(inferErrorCode(400, text)).toBe(code);
      }
    });

    it('recognises the templated lockout text and the single-code statuses', () => {
      expect(inferErrorCode(429, 'Too many wrong codes. Wait 7 minutes and try again.')).toBe(
        'HR_PAIRING_CODE_LOCKED',
      );
      expect(inferErrorCode(403, 'anything')).toBe('HR_APP_NOT_PAIRED');
      expect(inferErrorCode(429, 'anything')).toBe('HR_TOO_MANY_ATTEMPTS');
      expect(inferErrorCode(422, 'anything')).toBeUndefined();
    });
  });

  describe('bytesToBase64', () => {
    it('matches Buffer for every padding case and random bytes', () => {
      for (const length of [0, 1, 2, 3, 4, 5, 31, 32, 63, 64, 70, 71, 72]) {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          bytes[i] = (i * 73 + 11) & 255;
        }
        expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      }
      const random = webcrypto.getRandomValues(new Uint8Array(200));
      expect(bytesToBase64(random)).toBe(Buffer.from(random).toString('base64'));
    });
  });

  it('getPunches refuses dates that are not yyyy-MM-dd before any request', async () => {
    const { fetch, captured } = fakeFetch([]);
    await expect(client(fetch).getPunches('2025-4-3', '2025-04-03')).rejects.toThrow(/from/);
    await expect(client(fetch).getPunches('2025-04-03', '03/04/2025')).rejects.toThrow(/to/);
    expect(captured).toHaveLength(0);
  });
});
