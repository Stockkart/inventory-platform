/**
 * Live contract test: the app's real client code against a running `inventory-api` (checkpoint
 * 15). It proves that the canonical punch payload, the signed request envelope, the Base64 DER
 * signature encoding and the DTO shapes the TypeScript side produces are the ones the Java side
 * verifies and parses, end to end over HTTPS, through the backend's real interceptor chain
 * (`AuthenticationInterceptor` public patterns, `AttendanceAppAuthInterceptor`, body caching
 * filter), not the standalone MockMvc wiring of `AttendanceAppControllerIT`.
 *
 * Everything the phone would run is the real module: `AppClient`, `PairingFlow`, `PunchFlow`,
 * `PunchQueue` + `SyncWorker` (offline path), `loadHistory`, `agreeReconsent`, `removePhone`,
 * `resolveLaunchRoute`, `PairingStore`. Only the hardware is faked: `FakeBiometricSigner` (real
 * P-256 keys in WebCrypto), an in-memory `SecureStorage`, a `MemoryDatabase` for SQLite and a
 * location reader that is never asked (the shop's Location check stays off).
 *
 * The manager's side (sign up, register a shop, turn the switch on, add an employee, create the
 * pairing code) goes through the backend's own Bearer endpoints with plain `fetch`, so nothing is
 * written to MongoDB by hand and the test needs no database driver.
 *
 * Skipped unless `ATTENDANCE_CONTRACT_URL` is set (an `https://host[:port]/api/v1` base; the client
 * refuses anything else, R9.7). The backend may run with a self-signed certificate: point
 * `NODE_EXTRA_CA_CERTS` at its PEM before starting vitest. See `apps/attendance/README.md`,
 * "Live contract test", for the full recipe.
 *
 * Each run signs up a fresh owner and shop, so it leaves nothing behind that a second run trips
 * over and needs no cleanup on a throwaway database.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  DUPLICATE_SENTENCE,
  SERVER_MESSAGES,
  punchConfirmation,
  refusalText,
} from '@inventory-platform/attendance-protocol';
import type {
  AppPunchRequest,
  AppPunchResponse,
  ClaimPairingResponse,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

import { AppClient, ServerRefusal, isServerRefusal } from '../api/appClient';
import { resolveLaunchRoute } from '../app/LaunchGate';
import { agreeReconsent } from '../app/reconsent';
import { HistoryCache, type HistoryEntry } from '../history/HistoryCache';
import { loadHistory } from '../history/loadHistory';
import type { LocationReader } from '../location/LocationReader';
import { PairingFlow } from '../pairing/PairingFlow';
import { PunchFlow } from '../punch/PunchFlow';
import { ALWAYS_REACHABLE } from '../punch/reachability';
import { MemoryDatabase } from '../queue/memoryDb';
import { PunchQueue } from '../queue/PunchQueue';
import { SyncWorker, type QueueState } from '../queue/SyncWorker';
import { removePhone } from '../settings/removePhone';
import { FakeBiometricSigner } from '../signer/FakeBiometricSigner';
import { PairingStore, type SecureStorage } from '../state/pairingStore';

// `PairingStore` imports the Expo modules at module scope; the test injects its own storage and
// UUID source, so the modules only need to load (vi.mock is hoisted above the imports).
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => crypto.randomUUID() }));

const BASE_URL = process.env['ATTENDANCE_CONTRACT_URL'];

// ---- manager side: plain fetch against the Bearer endpoints -----------------------------------

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function api<T>(
  method: 'GET' | 'POST' | 'PUT',
  route: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || payload.success !== true) {
    throw new Error(
      `${method} ${route} → ${response.status}: ${JSON.stringify(payload).slice(0, 400)}`,
    );
  }
  return payload.data as T;
}

/** `yyyy-MM-dd` in Asia/Kolkata, `days` before today. */
function kolkataDate(daysAgo: number): string {
  const ms = Date.now() - daysAgo * 86_400_000 + (5 * 60 + 30) * 60_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** A fresh owner, shop (switch on) and employee; returns the Bearer token and the ids. */
async function seedShop(): Promise<{ token: string; shopId: string; employeeId: string }> {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const signup = await api<{ accessToken: string }>('POST', '/auth/signup', {
    name: `Contract Owner ${stamp}`,
    email: `contract-${stamp}@example.invalid`,
    password: 'contract-test-pass-1',
    phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
    role: 'OWNER',
  });
  const token = signup.accessToken;
  const shop = await api<{ shopId: string }>(
    'POST',
    '/shops/register',
    {
      name: `Contract Shop ${stamp}`,
      businessId: `CT-${stamp}`,
      location: { primaryAddress: '1 Test Road', state: 'KA', city: 'Bengaluru', pin: '560001' },
      contactEmail: `shop-${stamp}@example.invalid`,
      contactPhone: '9876500000',
      shopType: 'RETAILER',
      verticalId: 'grocery',
    },
    token,
  );
  await api('PUT', '/hr/settings', { attendanceCapture: { biometricApp: true } }, token);
  const employee = await api<{ id: string }>(
    'POST',
    '/hr/employees',
    { name: 'Contract Worker', designation: 'Helper', joinDate: kolkataDate(2) },
    token,
  );
  return { token, shopId: shop.shopId, employeeId: employee.id };
}

// ---- worker side: the real modules over fakes for the hardware ---------------------------------

function memoryStorage(): SecureStorage {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async deleteItem(key) {
      map.delete(key);
    },
  };
}

/** The shop's Location check is off in this test, so the reader must never be asked. */
const neverRead: Pick<LocationReader, 'read'> = {
  read: async () => {
    throw new Error('Location check is off: the reader must not be called');
  },
};

interface Phone {
  signer: FakeBiometricSigner;
  store: PairingStore;
  client: AppClient;
  db: MemoryDatabase;
  queue: PunchQueue;
  history: HistoryCache;
  /** Every request `PunchFlow` posted, for the replay check. */
  sent: AppPunchRequest[];
  /** Overrides the pairing id the client signs with (null = what the store holds). */
  forcePairingId: (id: string | null | undefined) => void;
}

function phone(): Phone {
  const signer = new FakeBiometricSigner();
  const db = new MemoryDatabase();
  const queue = new PunchQueue(db);
  const history = new HistoryCache(db);
  const store = new PairingStore({
    storage: memoryStorage(),
    randomUUID: () => crypto.randomUUID(),
    deleteKeys: () => signer.deleteKeys(),
    deleteQueue: () => queue.clear(),
  });
  let forced: string | null | undefined;
  const client = new AppClient({
    baseUrl: BASE_URL as string,
    signer,
    pairingId: async () =>
      forced !== undefined ? forced : (await store.load())?.pairingId ?? null,
    fetch: (input, init) => fetch(input, init),
  });
  return {
    signer,
    store,
    client,
    db,
    queue,
    history,
    sent: [],
    forcePairingId: (id) => {
      forced = id;
    },
  };
}

function punchFlow(p: Phone, options: { offline?: boolean; clock?: () => number } = {}): PunchFlow {
  return new PunchFlow({
    client: {
      postPunch: (request) => {
        p.sent.push(request);
        return p.client.postPunch(request);
      },
    },
    signer: p.signer,
    locationReader: neverRead,
    pairingStore: p.store,
    reachability: options.offline ? { probe: async () => false } : ALWAYS_REACHABLE,
    queue: p.queue,
    clock: options.clock,
  });
}

const DEVICE = {
  os: 'ANDROID' as const,
  osVersion: '14',
  phoneModel: 'Contract Phone',
  appVersion: '0.0.1',
};

// ---- the contract -------------------------------------------------------------------------------

describe.skipIf(!BASE_URL)('Attendance app ↔ inventory-api live contract', () => {
  let token: string;
  let shopId: string;
  let employeeId: string;
  let worker: Phone;
  let bootstrap: PairingBootstrap;
  let firstPunch: AppPunchResponse;

  beforeAll(async () => {
    ({ token, shopId, employeeId } = await seedShop());
    worker = phone();
  }, 60_000);

  afterAll(async () => {
    await worker?.db.closeAsync();
  });

  it('pairs through claim → consent → complete with the keys the signer made (R2.6–R2.9, R5.1)', async () => {
    const code = await api<{ code: string; qrPayload: string; expiresAt: string }>(
      'POST',
      `/hr/employees/${employeeId}/pairing-codes`,
      undefined,
      token,
    );
    expect(code.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);

    const flow = new PairingFlow({
      client: worker.client,
      signer: worker.signer,
      store: worker.store,
      device: DEVICE,
    });

    // The QR payload is what the camera hands over; the typed code is the same 8 characters.
    const claimed = await flow.submitCode(code.qrPayload);
    expect(claimed.kind).toBe('claimed');
    const claim = (claimed as { claim: ClaimPairingResponse }).claim;
    expect(claim.employeeName).toBe('Contract Worker');
    expect(claim.consent.recorded.length).toBeGreaterThan(0);
    expect(claim.consent.neverRecorded.length).toBeGreaterThan(0);
    expect(claim.consent.visibility.length).toBeGreaterThan(0);

    const agreed = await flow.agree(claim.claimToken, claim.consent.version);
    expect(agreed.kind).toBe('paired');
    bootstrap = (agreed as { pairing: PairingBootstrap }).pairing;
    expect(bootstrap.shopId).toBe(shopId);
    expect(bootstrap.employeeId).toBe(employeeId);
    expect(bootstrap.pairingId).toMatch(/^[0-9a-f]{24}$/);
    expect(bootstrap.location.locationCheck).toBe(false);
    expect(bootstrap.consentVersion).toBe(claim.consent.version);
    expect(await worker.store.load()).toMatchObject({ pairingId: bootstrap.pairingId });
    expect(worker.signer.hasKeys()).toBe(true);

    // The manager's page sees the Paired state with the model the phone reported (R2.2).
    const state = await api<{ state: string; phoneModel: string; lastPunchAt: string | null }>(
      'GET',
      `/hr/employees/${employeeId}/pairing`,
      undefined,
      token,
    );
    expect(state).toMatchObject({
      state: 'PAIRED',
      phoneModel: 'Contract Phone',
      lastPunchAt: null,
    });
  });

  it('GET /me through the signed envelope answers the home screen (R4.1, R9.8)', async () => {
    const route = await resolveLaunchRoute({ pairingStore: worker.store, client: worker.client });
    expect(route.name).toBe('Home');
    const status = (route as { status: NonNullable<Awaited<ReturnType<AppClient['getMe']>>> })
      .status;
    expect(status).toMatchObject({
      employeeName: 'Contract Worker',
      biometricApp: true,
      canPunch: true,
      nextDirection: 'IN',
      todayIn: null,
    });
    expect(status.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(status.consent).toMatchObject({
      reconsentRequired: false,
      agreedVersion: bootstrap.consentVersion,
    });
    expect(worker.client.hasServerTime).toBe(true);
  });

  it('an online punch signed by the punch key is stored with the server time (R4.2–R4.4, R4.7, R5.6–R5.7)', async () => {
    const result = await punchFlow(worker).run({ directionGuess: 'IN' });
    expect(result.kind).toBe('stored');
    firstPunch = (result as { response: AppPunchResponse }).response;
    expect(firstPunch).toMatchObject({
      outcome: 'STORED',
      direction: 'IN',
      duplicate: false,
      nextDirection: 'OUT',
    });
    expect(firstPunch.flags).toEqual([]);
    expect(firstPunch.atLocal).toMatch(/^\d{2}:\d{2}$/);
    expect((result as { lines: string[] }).lines).toEqual([
      punchConfirmation('IN', firstPunch.atLocal),
    ]);
    // Server clock, not the phone's: within a minute of now and never the phone's whole-second stamp
    expect(Math.abs(Date.parse(firstPunch.at) - Date.now())).toBeLessThan(60_000);
    expect(worker.signer.punchSignatures).toBe(1);
  });

  it('replaying the identical request answers the stored result and stores nothing (R5.10)', async () => {
    const replay = await worker.client.postPunch(worker.sent[0]);
    expect(replay).toMatchObject({
      outcome: 'REPLAYED',
      direction: firstPunch.direction,
      at: firstPunch.at,
    });
  });

  it('a second tap within 5 minutes is stored as a duplicate (R4.8)', async () => {
    const result = await punchFlow(worker).run({ directionGuess: 'OUT' });
    expect(result.kind).toBe('stored');
    const response = (result as { response: AppPunchResponse }).response;
    expect(response).toMatchObject({ outcome: 'DUPLICATE', duplicate: true, nextDirection: 'OUT' });
    expect((result as { lines: string[] }).lines.at(-1)).toBe(DUPLICATE_SENTENCE);
  });

  it('an offline punch is queued, sent by the sync worker and stored with the phone time (R6.2–R6.9)', async () => {
    const phoneTimeMs = Math.floor((Date.now() - 30 * 60_000) / 1000) * 1000;
    const result = await punchFlow(worker, { offline: true, clock: () => phoneTimeMs }).run({
      directionGuess: 'OUT',
    });
    expect(result.kind).toBe('queued');
    expect(await worker.queue.waitingCount()).toBe(1);

    const states: QueueState[] = [];
    const sync = new SyncWorker({
      queue: worker.queue,
      client: worker.client,
      pairingStore: worker.store,
      history: worker.history,
      onChange: (state) => states.push(state),
    });
    await sync.start();
    await sync.runNow('start');
    sync.stop();

    expect(await worker.queue.waitingCount()).toBe(0);
    expect(await worker.queue.refused()).toEqual([]);
    expect(states.at(-1)).toMatchObject({ waiting: 0, refused: [] });

    const cached = await worker.history.list();
    const offline = cached.find((entry) => entry.flags.includes('RECORDED_OFFLINE'));
    expect(offline).toBeDefined();
    expect(offline?.atMs).toBe(phoneTimeMs);
  });

  it('GET /punches lists the worker\u2019s own punches, newest first, with the flags (R4.10, R8.9)', async () => {
    const loaded = await loadHistory({ client: worker.client, cache: worker.history });
    expect(loaded.kind).toBe('server');
    const entries = (loaded as { entries: HistoryEntry[] }).entries;
    expect(entries).toHaveLength(3);
    const times = entries.map((e) => e.atMs);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(entries.filter((e) => e.flags.includes('RECORDED_OFFLINE'))).toHaveLength(1);
    expect(entries.filter((e) => !e.counted)).toHaveLength(1);

    const manager = await api<{ lastPunchAt: string | null }>(
      'GET',
      `/hr/employees/${employeeId}/pairing`,
      undefined,
      token,
    );
    expect(manager.lastPunchAt).not.toBeNull();
  });

  it('POST /consent records the agreed version (R9.13)', async () => {
    const agreed = await agreeReconsent(
      { client: worker.client, pairingStore: worker.store },
      bootstrap.consentVersion,
    );
    expect(agreed).toEqual({ kind: 'agreed', version: bootstrap.consentVersion });
  });

  it('a request signed by a key the server does not know is refused as not verified (R5.7–R5.8)', async () => {
    const intruder = phone();
    await intruder.signer.createKeys();
    intruder.forcePairingId(bootstrap.pairingId);
    await expect(intruder.client.getMe()).rejects.toMatchObject({
      status: 422,
      code: 'HR_APP_NOT_VERIFIED',
      serverMessage: SERVER_MESSAGES.HR_APP_NOT_VERIFIED,
    });
    await intruder.db.closeAsync();
  });

  it('"Remove this phone" unpairs, wipes the phone and the old pairing then gets 403 (R3.2, R3.3, R3.7, R9.6)', async () => {
    const removed = await removePhone({ client: worker.client, pairingStore: worker.store });
    expect(removed).toEqual({ kind: 'unpaired' });
    expect(await worker.store.load()).toBeNull();
    expect(worker.signer.hasKeys()).toBe(false);
    expect(await worker.queue.waitingCount()).toBe(0);

    // The phone still had the keys cached (say a half-wiped install): the server refuses anyway.
    const stale = phone();
    await stale.signer.createKeys();
    stale.forcePairingId(bootstrap.pairingId);
    let refusal: unknown;
    try {
      await stale.client.getMe();
    } catch (error) {
      refusal = error;
    }
    expect(isServerRefusal(refusal)).toBe(true);
    const r = refusal as ServerRefusal;
    expect(r.status).toBe(403);
    expect(r.code).toBe('HR_APP_NOT_PAIRED');
    expect(r.notPaired).toBe(true);
    expect(r.serverMessage).toBe(SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    expect(r.message).toBe(refusalText('HR_APP_NOT_PAIRED', SERVER_MESSAGES.HR_APP_NOT_PAIRED));
    await stale.db.closeAsync();

    const state = await api<{ state: string }>(
      'GET',
      `/hr/employees/${employeeId}/pairing`,
      undefined,
      token,
    );
    expect(state.state).toBe('NOT_PAIRED');
  });
});
