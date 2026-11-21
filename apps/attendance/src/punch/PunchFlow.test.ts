import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BIOMETRIC_REQUIRED,
  DUPLICATE_SENTENCE,
  KEY_INVALIDATED,
  SAVED_OFFLINE,
  SERVER_MESSAGES,
  canonicalPunchPayload,
  flagSentence,
} from '@inventory-platform/attendance-protocol';
import type {
  AppPunchRequest,
  AppPunchResponse,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import type { LocationReadResult } from '../location/LocationReader';
import { MemoryDatabase } from '../queue/memoryDb';
import { PunchQueue } from '../queue/PunchQueue';
import { base64Decode } from '../signer/base64';
import { FakeBiometricSigner, verifyEcdsaSignature } from '../signer/FakeBiometricSigner';
import { PunchFlow, confirmationLines, type PunchFlowDeps } from './PunchFlow';
import { ALWAYS_REACHABLE, type Reachability } from './reachability';

const PAIRING: PairingBootstrap = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: {
    locationCheck: true,
    shopLat: 28.6139,
    shopLng: 77.209,
    radiusMetres: 100,
    outsideAction: 'FLAG',
  },
  consentVersion: 1,
};

const PUNCH_ID = '0f2b7c1e-9a3d-4e5f-8a6b-7c8d9e0f1a2b';
const NOW_MS = Date.UTC(2025, 3, 3, 3, 42, 7, 850); // 2025-04-03T03:42:07.850Z → 09:12:07 IST

const STORED: AppPunchResponse = {
  outcome: 'STORED',
  direction: 'IN',
  at: '2025-04-03T03:42:08Z',
  atLocal: '09:12',
  flags: [],
  duplicate: false,
  todayIn: '09:12',
  todayOut: null,
  nextDirection: 'OUT',
};

/** A fake `postPunch`: records requests and answers from a script. */
function fakeClient(answers: Array<AppPunchResponse | Error>) {
  const requests: AppPunchRequest[] = [];
  return {
    requests,
    async postPunch(request: AppPunchRequest): Promise<AppPunchResponse> {
      requests.push(request);
      const next = answers.shift();
      if (next === undefined) {
        throw new Error('no scripted answer');
      }
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
  };
}

function fakeReader(result: LocationReadResult) {
  const reads: Array<{ timeoutMs: number; shop: unknown }> = [];
  return {
    reads,
    async read(timeoutMs: number, shop: unknown): Promise<LocationReadResult> {
      reads.push({ timeoutMs, shop });
      return result;
    },
  };
}

function fakeStore(record: PairingBootstrap | null) {
  let wipes = 0;
  return {
    get wipes() {
      return wipes;
    },
    async load() {
      return record;
    },
    async wipe() {
      wipes++;
    },
  };
}

describe('PunchFlow (online path)', () => {
  let signer: FakeBiometricSigner;
  let publicKey: string;
  let queue: PunchQueue;

  beforeEach(async () => {
    signer = new FakeBiometricSigner();
    publicKey = (await signer.createKeys()).punchPublicKeySpki;
    queue = new PunchQueue(new MemoryDatabase(), { now: () => NOW_MS });
  });

  function flow(overrides: Partial<PunchFlowDeps> = {}) {
    return new PunchFlow({
      client: fakeClient([STORED]),
      signer,
      locationReader: fakeReader({ distanceMetres: 42, accuracyMetres: 12, mocked: false }),
      pairingStore: fakeStore(PAIRING),
      reachability: ALWAYS_REACHABLE,
      queue,
      clock: () => NOW_MS,
      uuid: () => PUNCH_ID.toUpperCase(),
      ...overrides,
    });
  }

  it('reads the location (15 s) only when the last received Location check is on', async () => {
    const reader = fakeReader({ distanceMetres: 42, accuracyMetres: 12, mocked: true });
    const client = fakeClient([STORED]);
    await flow({ client, locationReader: reader }).run({ directionGuess: 'IN' });
    expect(reader.reads).toEqual([{ timeoutMs: 15_000, shop: PAIRING.location }]);
    expect(client.requests[0]).toMatchObject({
      locationChecked: true,
      distanceMetres: 42,
      accuracyMetres: 12,
      mock: true,
    });

    const offReader = fakeReader({ distanceMetres: 1, accuracyMetres: 1, mocked: false });
    const offClient = fakeClient([STORED]);
    await flow({
      client: offClient,
      locationReader: offReader,
      pairingStore: fakeStore({ ...PAIRING, location: { locationCheck: false } }),
    }).run({ directionGuess: 'IN' });
    expect(offReader.reads).toEqual([]);
    expect(offClient.requests[0]).toMatchObject({
      locationChecked: false,
      distanceMetres: null,
      accuracyMetres: null,
      mock: false,
    });
  });

  it('sends "no location" fields when the reader gives NO_LOCATION', async () => {
    const client = fakeClient([STORED]);
    await flow({ client, locationReader: fakeReader('NO_LOCATION') }).run({ directionGuess: 'IN' });
    expect(client.requests[0]).toMatchObject({
      locationChecked: true,
      distanceMetres: null,
      accuracyMetres: null,
      mock: false,
    });
  });

  it('builds the payload fields: ids from the pairing, UUID punchId, phone time in UTC whole seconds, offline 0, no direction', async () => {
    const client = fakeClient([STORED]);
    await flow({ client }).run({ directionGuess: 'IN' });
    const sent = client.requests[0];
    expect(sent).toMatchObject({
      pairingId: PAIRING.pairingId,
      shopId: PAIRING.shopId,
      employeeId: PAIRING.employeeId,
      punchId: PUNCH_ID,
      phoneTime: '2025-04-03T03:42:07Z',
      offline: false,
    });
    expect(Object.keys(sent).sort()).toEqual(
      [
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
        'signature',
      ].sort(),
    );
    expect(sent).not.toHaveProperty('direction');
    expect(JSON.stringify(sent)).not.toContain('28.6139');
  });

  it('signs the canonical payload with the punch key so the server-side check verifies', async () => {
    const client = fakeClient([STORED]);
    await flow({ client }).run({ directionGuess: 'IN' });
    const { signature, ...fields } = client.requests[0];
    const ok = await verifyEcdsaSignature(
      publicKey,
      canonicalPunchPayload(fields),
      base64Decode(signature),
    );
    expect(ok).toBe(true);
    expect(signer.punchSignatures).toBe(1);
    // One payload change → the stored signature no longer verifies.
    const tampered = canonicalPunchPayload({ ...fields, distanceMetres: 43 });
    expect(await verifyEcdsaSignature(publicKey, tampered, base64Decode(signature))).toBe(false);
  });

  it.each(['BIOMETRIC_FAILED', 'BIOMETRIC_CANCELLED', 'BIOMETRIC_LOCKED_OUT'] as const)(
    '%s: sends nothing and answers the R5.5 sentence',
    async (outcome) => {
      const client = fakeClient([STORED]);
      signer.nextPunchOutcomes = [outcome];
      const result = await flow({ client }).run({ directionGuess: 'IN' });
      expect(result).toEqual({
        kind: 'biometric_required',
        message: BIOMETRIC_REQUIRED,
        code: outcome,
      });
      expect(client.requests).toEqual([]);
      expect(signer.punchSignatures).toBe(0);
    },
  );

  it('KEY_INVALIDATED: sends nothing and answers a signer error with the design message', async () => {
    const client = fakeClient([STORED]);
    signer.invalidatePunchKey();
    const result = await flow({ client }).run({ directionGuess: 'IN' });
    expect(result).toEqual({
      kind: 'signer_error',
      message: KEY_INVALIDATED,
      code: 'KEY_INVALIDATED',
    });
    expect(client.requests).toEqual([]);
  });

  it('a stored punch answers the confirmation, one flag sentence per line and the duplicate line', async () => {
    const response: AppPunchResponse = {
      ...STORED,
      direction: 'OUT',
      atLocal: '18:05',
      flags: ['OUTSIDE_SHOP', 'LOW_ACCURACY'],
      duplicate: true,
    };
    const result = await flow({ client: fakeClient([response]) }).run({ directionGuess: 'OUT' });
    expect(result.kind).toBe('stored');
    if (result.kind !== 'stored') {
      return;
    }
    expect(result.lines).toEqual([
      'Checked out at 18:05',
      flagSentence('OUTSIDE_SHOP'),
      flagSentence('LOW_ACCURACY'),
      DUPLICATE_SENTENCE,
    ]);
    expect(result.response).toBe(response);
    expect(confirmationLines(STORED)).toEqual(['Checked in at 09:12']);
  });

  it('a refusal is passed on word for word, without wiping', async () => {
    const store = fakeStore(PAIRING);
    const refusal = new ServerRefusal(409, SERVER_MESSAGES.HR_DAY_HAS_LEAVE);
    const result = await flow({ client: fakeClient([refusal]), pairingStore: store }).run({
      directionGuess: 'IN',
    });
    expect(result).toEqual({
      kind: 'refused',
      message: 'You are on approved leave today',
      code: 'HR_DAY_HAS_LEAVE',
    });
    expect(store.wipes).toBe(0);
  });

  it('HR_APP_NOT_PAIRED wipes the phone and answers unpaired with the R3.2 + R7.10 text', async () => {
    const store = fakeStore(PAIRING);
    const refusal = new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    const result = await flow({ client: fakeClient([refusal]), pairingStore: store }).run({
      directionGuess: 'IN',
    });
    expect(store.wipes).toBe(1);
    expect(result.kind).toBe('unpaired');
    if (result.kind === 'unpaired') {
      expect(result.message).toBe(
        'This phone is no longer paired. Ask your manager.\nAsk your manager to mark your attendance.',
      );
    }
  });

  it('not paired locally: answers unpaired without probing, reading location, signing or sending', async () => {
    const client = fakeClient([STORED]);
    const reader = fakeReader('NO_LOCATION');
    const probe = vi.fn(async () => true);
    const result = await flow({
      client,
      locationReader: reader,
      pairingStore: fakeStore(null),
      reachability: { probe },
    }).run({
      directionGuess: 'IN',
    });
    expect(result.kind).toBe('unpaired');
    expect(probe).not.toHaveBeenCalled();
    expect(reader.reads).toEqual([]);
    expect(client.requests).toEqual([]);
    expect(signer.punchSignatures).toBe(0);
  });

  it('probes reachability before the location read and the biometric prompt, and sends offline=0 when reachable', async () => {
    const order: string[] = [];
    const probe: Reachability = {
      probe: async () => {
        order.push('probe');
        return true;
      },
    };
    const reader = {
      async read(): Promise<LocationReadResult> {
        order.push('location');
        return 'NO_LOCATION';
      },
    };
    const client = fakeClient([STORED]);
    const original = signer.signPunch.bind(signer);
    signer.signPunch = async (bytes, prompt) => {
      order.push('biometric');
      return original(bytes, prompt);
    };
    await flow({ client, locationReader: reader, reachability: probe }).run({
      directionGuess: 'IN',
    });
    expect(order).toEqual(['probe', 'location', 'biometric']);
    expect(client.requests[0]).toMatchObject({ offline: false });
    expect(await queue.waitingCount()).toBe(0);
  });
});

describe('PunchFlow (offline path, R6.1–R6.3)', () => {
  let signer: FakeBiometricSigner;
  let publicKey: string;
  let queue: PunchQueue;

  beforeEach(async () => {
    signer = new FakeBiometricSigner();
    publicKey = (await signer.createKeys()).punchPublicKeySpki;
    queue = new PunchQueue(new MemoryDatabase(), { now: () => NOW_MS });
  });

  function flow(overrides: Partial<PunchFlowDeps> = {}) {
    return new PunchFlow({
      client: fakeClient([STORED]),
      signer,
      locationReader: fakeReader({ distanceMetres: 42, accuracyMetres: 12, mocked: false }),
      pairingStore: fakeStore(PAIRING),
      reachability: { probe: async () => false },
      queue,
      clock: () => NOW_MS,
      uuid: () => PUNCH_ID.toUpperCase(),
      ...overrides,
    });
  }

  it('server not reachable: signs offline=1 with the phone clock, queues it, makes no network call and answers SAVED_OFFLINE', async () => {
    const client = fakeClient([STORED]);
    const onQueued = vi.fn(async () => undefined);
    const result = await flow({ client, onQueued }).run({ directionGuess: 'OUT' });

    expect(client.requests).toEqual([]);
    expect(result.kind).toBe('queued');
    if (result.kind !== 'queued') {
      return;
    }
    expect(result.message).toBe(SAVED_OFFLINE);
    expect(result.signedOnline).toBe(false);
    expect(result.punch).toMatchObject({
      punchId: PUNCH_ID,
      directionGuess: 'OUT',
      state: 'WAITING',
      phoneTime: '2025-04-03T03:42:07Z',
    });
    expect(result.punch.request).toMatchObject({
      pairingId: PAIRING.pairingId,
      offline: true,
      locationChecked: true,
      distanceMetres: 42,
      accuracyMetres: 12,
      mock: false,
    });
    expect(onQueued).toHaveBeenCalledTimes(1);
    expect(onQueued).toHaveBeenCalledWith(result.punch);

    // The queued bytes are what the server will verify: offline=1, signed by the punch key.
    const stored = await queue.get(PUNCH_ID);
    expect(stored?.request).toEqual(result.punch.request);
    const { signature, ...fields } = result.punch.request;
    expect(
      await verifyEcdsaSignature(publicKey, canonicalPunchPayload(fields), base64Decode(signature)),
    ).toBe(true);
    expect(signer.punchSignatures).toBe(1);
    expect(await queue.waitingCount()).toBe(1);
    expect(await queue.newestKnownDirection()).toBe('OUT');
    expect(JSON.stringify(stored)).not.toContain('28.6139');
  });

  it('offline: still reads the location when the last received Location check was on, and skips it when off (R6.2)', async () => {
    const reader = fakeReader({ distanceMetres: 7, accuracyMetres: 3, mocked: true });
    const result = await flow({ locationReader: reader }).run({ directionGuess: 'IN' });
    expect(reader.reads).toEqual([{ timeoutMs: 15_000, shop: PAIRING.location }]);
    expect(result.kind === 'queued' && result.punch.request).toMatchObject({
      offline: true,
      locationChecked: true,
      distanceMetres: 7,
      accuracyMetres: 3,
      mock: true,
    });

    const offReader = fakeReader({ distanceMetres: 1, accuracyMetres: 1, mocked: false });
    const offQueue = new PunchQueue(new MemoryDatabase());
    const off = await flow({
      locationReader: offReader,
      queue: offQueue,
      pairingStore: fakeStore({ ...PAIRING, location: { locationCheck: false } }),
    }).run({ directionGuess: 'IN' });
    expect(offReader.reads).toEqual([]);
    expect(off.kind === 'queued' && off.punch.request).toMatchObject({
      offline: true,
      locationChecked: false,
      distanceMetres: null,
      accuracyMetres: null,
    });
  });

  it.each(['BIOMETRIC_FAILED', 'BIOMETRIC_CANCELLED', 'BIOMETRIC_LOCKED_OUT'] as const)(
    'offline, %s: saves nothing and answers the R5.5 sentence',
    async (outcome) => {
      signer.nextPunchOutcomes = [outcome];
      const onQueued = vi.fn();
      const result = await flow({ onQueued }).run({ directionGuess: 'IN' });
      expect(result).toEqual({
        kind: 'biometric_required',
        message: BIOMETRIC_REQUIRED,
        code: outcome,
      });
      expect(await queue.waitingCount()).toBe(0);
      expect(onQueued).not.toHaveBeenCalled();
    },
  );

  it('probe said reachable but the send found the server not reachable: the offline=0 punch is queued as is (edge)', async () => {
    const client = fakeClient([new NotReachable('TIMEOUT')]);
    const onQueued = vi.fn(async () => undefined);
    const result = await flow({ client, reachability: ALWAYS_REACHABLE, onQueued }).run({
      directionGuess: 'IN',
    });
    expect(client.requests).toHaveLength(1);
    expect(result.kind).toBe('queued');
    if (result.kind !== 'queued') {
      return;
    }
    expect(result.message).toBe(SAVED_OFFLINE);
    expect(result.signedOnline).toBe(true);
    expect(result.punch.request).toEqual(client.requests[0]);
    expect(result.punch.request.offline).toBe(false);
    expect(signer.punchSignatures).toBe(1); // no second biometric prompt
    expect(await queue.waitingCount()).toBe(1);
    expect(onQueued).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['CONNECTION', new NotReachable('CONNECTION')],
    ['SERVER_ERROR 503', new NotReachable('SERVER_ERROR', 503)],
    ['BAD_ANSWER', new NotReachable('BAD_ANSWER', 200)],
  ] as const)('a %s on send counts as not reachable and queues too', async (_name, error) => {
    const result = await flow({
      client: fakeClient([error]),
      reachability: ALWAYS_REACHABLE,
    }).run({ directionGuess: 'IN' });
    expect(result.kind).toBe('queued');
    expect(await queue.waitingCount()).toBe(1);
  });

  it('a refusal on send is an answer, not "not reachable": nothing is queued', async () => {
    const refusal = new ServerRefusal(409, SERVER_MESSAGES.HR_APP_OFF);
    const result = await flow({
      client: fakeClient([refusal]),
      reachability: ALWAYS_REACHABLE,
    }).run({ directionGuess: 'IN' });
    expect(result.kind).toBe('refused');
    expect(await queue.waitingCount()).toBe(0);
  });
});
