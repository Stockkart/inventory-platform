import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  NO_SECURE_HARDWARE,
  NO_STRONG_BIOMETRIC_ENROLLED,
  NO_STRONG_BIOMETRIC_HARDWARE,
  PAIRING_NO_NETWORK,
  SERVER_MESSAGES,
  pairingCodeLockedMessage,
  pairingQrPayload,
} from '@inventory-platform/attendance-protocol';
import type {
  AppErrorCode,
  ClaimPairingResponse,
  CompletePairingRequest,
  ConsentVersion,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { FakeBiometricSigner } from '../signer/FakeBiometricSigner';
import { CodeAttemptLockout, LOCKOUT_DURATION_MS, lockoutCountdown } from './CodeAttemptLockout';
import { PairingFlow, type DeviceInfo, type PairingClient } from './PairingFlow';

const CODE = 'ABCD2345';
const CLAIM_TOKEN = 'claim-token-1';
const INSTALLATION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const T0 = Date.UTC(2025, 3, 3, 9, 0, 0);

const CONSENT: ConsentVersion = {
  version: 2,
  kind: 'RECONSENT_REQUIRED',
  recorded: ['Your check-in and check-out time'],
  neverRecorded: ['Your fingerprint'],
  visibility: ["The shop's managers can see your attendance"],
};

const CLAIM: ClaimPairingResponse = {
  claimToken: CLAIM_TOKEN,
  shopName: 'Sharma Stores',
  employeeName: 'Ravi Kumar',
  consent: CONSENT,
};

const BOOTSTRAP: PairingBootstrap = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '66f1a2b3c4d5e6f708192a3c',
  employeeId: '66f1a2b3c4d5e6f708192a3d',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: { locationCheck: false },
  consentVersion: 2,
};

const DEVICE: DeviceInfo = {
  os: 'ANDROID',
  osVersion: '13',
  phoneModel: 'Redmi Note 11',
  appVersion: '0.1.0',
};

/** The HTTP status the backend uses for each pairing refusal (design API table). */
const STATUS: Partial<Record<AppErrorCode, number>> = {
  HR_PAIRING_CODE_EXPIRED: 410,
  HR_PAIRING_CODE_USED: 409,
  HR_PAIRING_CODE_CANCELLED: 409,
  HR_PAIRING_CODE_WRONG: 404,
  HR_APP_OFF: 409,
  HR_PAIRING_EMPLOYEE_EXITED: 422,
  HR_TOO_MANY_ATTEMPTS: 429,
};

function refusal(code: AppErrorCode): ServerRefusal {
  return new ServerRefusal(STATUS[code] ?? 409, SERVER_MESSAGES[code]);
}

type MockedClient = { [K in keyof PairingClient]: Mock<PairingClient[K]> };

/** Every call is a mock; an override's own mock still sees its calls, since it is the implementation. */
function makeClient(overrides: Partial<PairingClient> = {}): MockedClient {
  return {
    claim: vi.fn(overrides.claim ?? (async () => CLAIM)),
    complete: vi.fn(overrides.complete ?? (async () => BOOTSTRAP)),
    abandon: vi.fn(overrides.abandon ?? (async () => ({ abandoned: true }))),
  };
}

function makeStore() {
  return {
    installationId: vi.fn(async () => INSTALLATION_ID),
    save: vi.fn(async (_pairing: PairingBootstrap) => undefined),
  };
}

function setup(options: { client?: Partial<PairingClient>; signer?: FakeBiometricSigner } = {}) {
  const client = makeClient(options.client);
  const signer = options.signer ?? new FakeBiometricSigner();
  const store = makeStore();
  let now = T0;
  const clock = { now: () => now, advance: (ms: number) => (now += ms) };
  const flow = new PairingFlow({
    client,
    signer,
    store,
    device: DEVICE,
    now: clock.now,
    lockout: new CodeAttemptLockout(),
  });
  return { flow, client, signer, store, clock };
}

describe('PairingFlow.submitCode', () => {
  it.each(['', 'ABCD234', 'ABCD23456', 'ABCD234O', 'ABCD234I', 'abcd-01zz', '!@#$%^&*'])(
    'rejects %j before any network call (R2.3)',
    async (text) => {
      const { flow, client, signer } = setup();
      const capability = vi.spyOn(signer, 'capability');

      const result = await flow.submitCode(text);

      expect(result).toEqual({
        kind: 'invalid_code',
        message: SERVER_MESSAGES.HR_PAIRING_CODE_WRONG,
      });
      expect(client.claim).not.toHaveBeenCalled();
      expect(capability).not.toHaveBeenCalled();
    },
  );

  it('accepts typing in any case with spaces or hyphens, and the QR URL', async () => {
    const { flow, client } = setup();

    await flow.submitCode(' abcd-2345 ');
    await flow.submitCode('ABCD 2345');
    await flow.submitCode(pairingQrPayload(CODE));

    expect(client.claim).toHaveBeenCalledTimes(3);
    for (const call of client.claim.mock.calls) {
      expect(call[0].code).toBe(CODE);
    }
  });

  it.each([
    ['NO_STRONG_BIOMETRIC_ENROLLED', NO_STRONG_BIOMETRIC_ENROLLED],
    ['NO_STRONG_BIOMETRIC_HARDWARE', NO_STRONG_BIOMETRIC_HARDWARE],
    ['NO_SECURE_HARDWARE', NO_SECURE_HARDWARE],
  ] as const)(
    'stops at the capability gate %s without sending the code (R2.7, R5.4)',
    async (capability, message) => {
      const { flow, client } = setup({ signer: new FakeBiometricSigner({ capability }) });

      const result = await flow.submitCode(CODE);

      expect(result).toEqual({ kind: 'phone_not_ready', capability, message });
      expect(client.claim).not.toHaveBeenCalled();
    },
  );

  it('claims the code with the installation id and device description, and returns the names (R2.6)', async () => {
    const { flow, client } = setup();

    const result = await flow.submitCode(CODE);

    expect(result).toEqual({ kind: 'claimed', code: CODE, claim: CLAIM });
    expect(client.claim).toHaveBeenCalledWith({
      code: CODE,
      installationId: INSTALLATION_ID,
      os: 'ANDROID',
      osVersion: '13',
      phoneModel: 'Redmi Note 11',
      appVersion: '0.1.0',
    });
  });

  it('cuts the phone model to the 80 characters the server accepts', async () => {
    const client = makeClient();
    const flow = new PairingFlow({
      client,
      signer: new FakeBiometricSigner(),
      store: makeStore(),
      device: { ...DEVICE, phoneModel: 'X'.repeat(120) },
    });

    await flow.submitCode(CODE);

    expect(client.claim.mock.calls[0][0].phoneModel).toHaveLength(80);
  });

  it.each([
    'HR_PAIRING_CODE_EXPIRED',
    'HR_PAIRING_CODE_USED',
    'HR_PAIRING_CODE_CANCELLED',
    'HR_PAIRING_CODE_WRONG',
    'HR_APP_OFF',
    'HR_PAIRING_EMPLOYEE_EXITED',
  ] as const)('shows the server text of %s word for word (R2.14)', async (code) => {
    const { flow } = setup({ client: { claim: vi.fn(async () => Promise.reject(refusal(code))) } });

    const result = await flow.submitCode(CODE);

    expect(result).toEqual({ kind: 'refused', code, message: SERVER_MESSAGES[code] });
  });

  it('offers Retry when the server is not reachable; the code is unchanged (R2.14 no network)', async () => {
    const claim = vi
      .fn<PairingClient['claim']>()
      .mockRejectedValueOnce(new NotReachable('TIMEOUT'))
      .mockResolvedValueOnce(CLAIM);
    const { flow } = setup({ client: { claim } });

    const first = await flow.submitCode(CODE);
    expect(first).toEqual({ kind: 'not_reachable', message: PAIRING_NO_NETWORK });
    expect(flow.lockoutRemainingMs()).toBe(0);

    const second = await flow.submitCode(CODE);
    expect(second).toEqual({ kind: 'claimed', code: CODE, claim: CLAIM });
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[1][0].code).toBe(CODE);
  });

  it('locks for 15 minutes after 5 refused codes within 15 minutes and counts down (R2.5)', async () => {
    const claim = vi.fn(async () => Promise.reject(refusal('HR_PAIRING_CODE_WRONG')));
    const { flow, clock } = setup({ client: { claim } });

    for (let i = 0; i < 4; i++) {
      clock.advance(60_000);
      expect((await flow.submitCode(CODE)).kind).toBe('refused');
    }
    clock.advance(60_000);
    const fifth = await flow.submitCode(CODE);
    expect(fifth).toEqual({
      kind: 'locked',
      remainingMs: LOCKOUT_DURATION_MS,
      message: lockoutCountdown(LOCKOUT_DURATION_MS),
    });
    expect(claim).toHaveBeenCalledTimes(5);

    clock.advance(5 * 60_000);
    const during = await flow.submitCode(CODE);
    expect(during).toEqual({
      kind: 'locked',
      remainingMs: 10 * 60_000,
      message: 'Too many wrong codes. Wait 10 minutes and try again.',
    });
    expect(claim).toHaveBeenCalledTimes(5);
    expect(flow.lockoutRemainingMs()).toBe(10 * 60_000);

    clock.advance(10 * 60_000);
    expect(flow.lockoutRemainingMs()).toBe(0);
    expect((await flow.submitCode(CODE)).kind).toBe('refused');
    expect(claim).toHaveBeenCalledTimes(6);
  });

  it('does not lock when the refusals are spread over more than 15 minutes', async () => {
    const claim = vi.fn(async () => Promise.reject(refusal('HR_PAIRING_CODE_WRONG')));
    const { flow, clock } = setup({ client: { claim } });

    for (let i = 0; i < 6; i++) {
      clock.advance(4 * 60_000);
      expect((await flow.submitCode(CODE)).kind).toBe('refused');
    }
    expect(claim).toHaveBeenCalledTimes(6);
  });

  it("does not count the shop's switch or an exited employee as a wrong code", async () => {
    const claim = vi
      .fn<PairingClient['claim']>()
      .mockRejectedValueOnce(refusal('HR_APP_OFF'))
      .mockRejectedValueOnce(refusal('HR_PAIRING_EMPLOYEE_EXITED'))
      .mockRejectedValueOnce(refusal('HR_APP_OFF'))
      .mockRejectedValueOnce(refusal('HR_APP_OFF'))
      .mockRejectedValueOnce(refusal('HR_APP_OFF'))
      .mockRejectedValueOnce(refusal('HR_APP_OFF'));
    const { flow } = setup({ client: { claim } });

    for (let i = 0; i < 6; i++) {
      expect((await flow.submitCode(CODE)).kind).toBe('refused');
    }
    expect(flow.lockoutRemainingMs()).toBe(0);
  });

  it("mirrors the server's own lockout answer in the countdown", async () => {
    const claim = vi.fn(async () =>
      Promise.reject(new ServerRefusal(429, pairingCodeLockedMessage(7))),
    );
    const { flow } = setup({ client: { claim } });

    const result = await flow.submitCode(CODE);

    expect(result).toEqual({
      kind: 'locked',
      remainingMs: 7 * 60_000,
      message: pairingCodeLockedMessage(7),
    });
    expect((await flow.submitCode(CODE)).kind).toBe('locked');
    expect(claim).toHaveBeenCalledTimes(1);
  });
});

describe('PairingFlow.decline', () => {
  it('abandons the claim so the code is invalidated (R2.6, R2.8)', async () => {
    const { flow, client, store } = setup();

    const result = await flow.decline(CLAIM_TOKEN);

    expect(result).toEqual({ abandoned: true });
    expect(client.abandon).toHaveBeenCalledWith({ claimToken: CLAIM_TOKEN });
    expect(client.complete).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('reports abandoned=false when the server cannot be reached and does not throw', async () => {
    const { flow } = setup({
      client: { abandon: vi.fn(async () => Promise.reject(new NotReachable('CONNECTION'))) },
    });

    await expect(flow.decline(CLAIM_TOKEN)).resolves.toEqual({ abandoned: false });
  });
});

describe('PairingFlow.agree', () => {
  it('creates both keys in the signer, completes with their public keys, then saves (R2.9, R5.1)', async () => {
    const { flow, client, signer, store } = setup();

    const result = await flow.agree(CLAIM_TOKEN, CONSENT.version);

    expect(result).toEqual({ kind: 'paired', pairing: BOOTSTRAP });
    expect(signer.hasKeys()).toBe(true);
    expect(client.complete).toHaveBeenCalledTimes(1);
    const request = client.complete.mock.calls[0][0] as CompletePairingRequest;
    expect(request.claimToken).toBe(CLAIM_TOKEN);
    expect(request.installationId).toBe(INSTALLATION_ID);
    expect(request.consentVersion).toBe(2);
    // Base64 DER SPKI of a P-256 key is 91 bytes → 122 Base64 characters plus "==" padding.
    expect(request.punchPublicKey).toMatch(/^[A-Za-z0-9+/]{122}==$/);
    expect(request.devicePublicKey).toMatch(/^[A-Za-z0-9+/]{122}==$/);
    expect(request.punchPublicKey).not.toBe(request.devicePublicKey);
    expect(store.save).toHaveBeenCalledWith(BOOTSTRAP);
  });

  it('asks the signer to attest the punch key with the claim token as challenge (task 16.4)', async () => {
    const { flow, signer } = setup();
    const createKeys = vi.spyOn(signer, 'createKeys');

    await flow.agree(CLAIM_TOKEN, CONSENT.version);

    expect(createKeys).toHaveBeenCalledTimes(1);
    const options = createKeys.mock.calls[0][0];
    expect(options?.attestationChallenge).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(options?.attestationChallenge)).toBe(CLAIM_TOKEN);
  });

  it('omits attestationChain when the signer returns no chain (iOS, fake, refused by the key store)', async () => {
    const { flow, client } = setup();

    await flow.agree(CLAIM_TOKEN, CONSENT.version);

    const request = client.complete.mock.calls[0][0] as CompletePairingRequest;
    expect('attestationChain' in request).toBe(false);
  });

  it('forwards the attestation chain when the signer provides one', async () => {
    const chain = ['TEVBRg==', 'SU5URVI=', 'Uk9PVA=='];
    const signer = new FakeBiometricSigner();
    const real = signer.createKeys.bind(signer);
    vi.spyOn(signer, 'createKeys').mockImplementation(async (options) => ({
      ...(await real(options)),
      punchAttestationChain: chain,
    }));
    const { flow, client } = setup({ signer });

    const result = await flow.agree(CLAIM_TOKEN, CONSENT.version);

    expect(result.kind).toBe('paired');
    const request = client.complete.mock.calls[0][0] as CompletePairingRequest;
    expect(request.attestationChain).toEqual(chain);
  });

  it('treats an empty chain as none', async () => {
    const signer = new FakeBiometricSigner();
    const real = signer.createKeys.bind(signer);
    vi.spyOn(signer, 'createKeys').mockImplementation(async (options) => ({
      ...(await real(options)),
      punchAttestationChain: [],
    }));
    const { flow, client } = setup({ signer });

    await flow.agree(CLAIM_TOKEN, CONSENT.version);

    const request = client.complete.mock.calls[0][0] as CompletePairingRequest;
    expect('attestationChain' in request).toBe(false);
  });

  it('saves only after the server answered: a refusal leaves no record and drops the keys', async () => {
    const { flow, client, signer, store } = setup({
      client: { complete: vi.fn(async () => Promise.reject(refusal('HR_PAIRING_CODE_EXPIRED'))) },
    });

    const result = await flow.agree(CLAIM_TOKEN, CONSENT.version);

    expect(result).toEqual({
      kind: 'refused',
      code: 'HR_PAIRING_CODE_EXPIRED',
      message: SERVER_MESSAGES.HR_PAIRING_CODE_EXPIRED,
    });
    expect(client.complete).toHaveBeenCalledTimes(1);
    expect(store.save).not.toHaveBeenCalled();
    expect(signer.hasKeys()).toBe(false);
  });

  it('retries with the same public keys after no answer, so a lost answer never leaves mismatched keys', async () => {
    const complete = vi
      .fn<PairingClient['complete']>()
      .mockRejectedValueOnce(new NotReachable('TIMEOUT'))
      .mockResolvedValueOnce(BOOTSTRAP);
    const { flow, store } = setup({ client: { complete } });

    const first = await flow.agree(CLAIM_TOKEN, CONSENT.version);
    expect(first).toEqual({ kind: 'not_reachable', message: PAIRING_NO_NETWORK });
    expect(store.save).not.toHaveBeenCalled();

    const second = await flow.agree(CLAIM_TOKEN, CONSENT.version);
    expect(second.kind).toBe('paired');
    expect(complete.mock.calls[0][0].punchPublicKey).toBe(complete.mock.calls[1][0].punchPublicKey);
    expect(complete.mock.calls[0][0].devicePublicKey).toBe(
      complete.mock.calls[1][0].devicePublicKey,
    );
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['NO_SECURE_HARDWARE', NO_SECURE_HARDWARE],
    ['NO_STRONG_BIOMETRIC_ENROLLED', NO_STRONG_BIOMETRIC_ENROLLED],
  ] as const)(
    'reports the phone as not fit when key creation fails with %s (R5.4)',
    async (capability, message) => {
      const signer = new FakeBiometricSigner({ capability });
      const { flow, client, store } = setup({ signer });

      const result = await flow.agree(CLAIM_TOKEN, CONSENT.version);

      expect(result).toEqual({ kind: 'phone_not_ready', message });
      expect(client.complete).not.toHaveBeenCalled();
      expect(store.save).not.toHaveBeenCalled();
    },
  );

  it('forgets earlier refusals once a pairing completes', async () => {
    const claim = vi
      .fn<PairingClient['claim']>()
      .mockRejectedValueOnce(refusal('HR_PAIRING_CODE_WRONG'))
      .mockRejectedValueOnce(refusal('HR_PAIRING_CODE_WRONG'))
      .mockRejectedValueOnce(refusal('HR_PAIRING_CODE_WRONG'))
      .mockRejectedValueOnce(refusal('HR_PAIRING_CODE_WRONG'))
      .mockResolvedValue(CLAIM);
    const { flow } = setup({ client: { claim } });

    for (let i = 0; i < 4; i++) {
      await flow.submitCode(CODE);
    }
    expect((await flow.submitCode(CODE)).kind).toBe('claimed');
    expect((await flow.agree(CLAIM_TOKEN, 2)).kind).toBe('paired');

    // A later wrong code after a fresh pairing attempt is the first of a new count, not the fifth.
    claim.mockRejectedValueOnce(refusal('HR_PAIRING_CODE_WRONG'));
    expect((await flow.submitCode(CODE)).kind).toBe('refused');
    expect(flow.lockoutRemainingMs()).toBe(0);
  });
});
