import { describe, expect, it, vi } from 'vitest';

import {
  KEY_INVALIDATED,
  PHONE_REPLACED,
  SERVER_MESSAGES,
} from '@inventory-platform/attendance-protocol';
import type { AppStatusResponse, ConsentVersion } from '@inventory-platform/attendance-protocol';

import { NoPairing, NotReachable, ServerRefusal } from '../api/appClient';
import { BiometricSignerError } from '../signer/BiometricSigner';
import type { PairingRecord } from '../state/pairingStore';
import { resolveLaunchRoute } from './LaunchGate';

const RECORD: PairingRecord = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: { locationCheck: false },
  consentVersion: 1,
};

const ME: AppStatusResponse = {
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  today: '2025-04-03',
  biometricApp: true,
  canPunch: true,
  reason: null,
  nextDirection: 'IN',
  todayIn: null,
  todayOut: null,
  location: {
    locationCheck: true,
    shopLat: 28.6,
    shopLng: 77.2,
    radiusMetres: 100,
    outsideAction: 'FLAG',
  },
  consent: { latestVersion: 1, reconsentRequired: false, agreedVersion: 1 },
};

const CONSENT_V2: ConsentVersion = {
  version: 2,
  kind: 'RECONSENT_REQUIRED',
  recorded: ['Your check-in and check-out time'],
  neverRecorded: ['Your fingerprint'],
  visibility: ['Your shop’s managers can see your attendance'],
};

function harness(options: {
  pairing?: PairingRecord | null;
  me?: AppStatusResponse | Error;
  consent?: ConsentVersion | Error;
  withUpdateLocation?: boolean;
}) {
  const wipe = vi.fn(async () => undefined);
  const updateLocation = vi.fn(async () => undefined);
  const getMe = vi.fn(async () => {
    const me = options.me ?? ME;
    if (me instanceof Error) {
      throw me;
    }
    return me;
  });
  const getLatestConsent = vi.fn(async () => {
    const consent = options.consent ?? CONSENT_V2;
    if (consent instanceof Error) {
      throw consent;
    }
    return consent;
  });
  const pairingStore = {
    load: async () => (options.pairing === undefined ? RECORD : options.pairing),
    wipe,
    ...(options.withUpdateLocation === false ? {} : { updateLocation }),
  };
  return {
    deps: { pairingStore, client: { getMe, getLatestConsent } },
    wipe,
    updateLocation,
    getMe,
    getLatestConsent,
  };
}

describe('resolveLaunchRoute', () => {
  it('no pairing record → Pair, without asking the server', async () => {
    const h = harness({ pairing: null });
    expect(await resolveLaunchRoute(h.deps)).toEqual({ name: 'Pair' });
    expect(h.getMe).not.toHaveBeenCalled();
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('paired and /me is fine → Home with the status, and the Location check settings are kept', async () => {
    const h = harness({});
    const route = await resolveLaunchRoute(h.deps);
    expect(route).toEqual({
      name: 'Home',
      pairing: { ...RECORD, location: ME.location },
      status: ME,
      offline: false,
    });
    expect(h.updateLocation).toHaveBeenCalledWith(ME.location);
    expect(h.getLatestConsent).not.toHaveBeenCalled();
  });

  it('reconsentRequired → Consent in reconsent mode with the latest text; Home is not opened (R9.13)', async () => {
    const h = harness({
      me: { ...ME, consent: { latestVersion: 2, reconsentRequired: true, agreedVersion: 1 } },
    });
    const route = await resolveLaunchRoute(h.deps);
    expect(route).toEqual({
      name: 'Consent',
      mode: 'reconsent',
      version: 2,
      consent: CONSENT_V2,
      pairing: { ...RECORD, location: ME.location },
    });
    expect(h.getLatestConsent).toHaveBeenCalledTimes(1);
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('reconsentRequired but the text could not be read → Consent with consent null, still not Home', async () => {
    const h = harness({
      me: { ...ME, consent: { latestVersion: 2, reconsentRequired: true, agreedVersion: 1 } },
      consent: new NotReachable('CONNECTION'),
    });
    const route = await resolveLaunchRoute(h.deps);
    expect(route).toMatchObject({ name: 'Consent', mode: 'reconsent', version: 2, consent: null });
  });

  it('KEY_INVALIDATED from the signer → wipe, then Pair with the KEY_INVALIDATED message', async () => {
    const h = harness({ me: new BiometricSignerError('KEY_INVALIDATED') });
    const route = await resolveLaunchRoute(h.deps);
    expect(h.wipe).toHaveBeenCalledTimes(1);
    expect(route).toEqual({ name: 'Pair', reason: 'KEY_INVALIDATED', message: KEY_INVALIDATED });
  });

  it('HR_APP_NOT_PAIRED from /me → wipe, then Pair with the server’s text (R3.2–R3.3)', async () => {
    const refusal = new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    const h = harness({ me: refusal });
    const route = await resolveLaunchRoute(h.deps);
    expect(h.wipe).toHaveBeenCalledTimes(1);
    expect(route).toEqual({ name: 'Pair', reason: 'NOT_PAIRED', message: refusal.message });
  });

  it('missing keys or a vanished record → wipe, then Pair with the PHONE_REPLACED wording (R5.9)', async () => {
    for (const error of [new BiometricSignerError('NO_KEYS'), new NoPairing()]) {
      const h = harness({ me: error });
      expect(await resolveLaunchRoute(h.deps)).toEqual({
        name: 'Pair',
        reason: 'NO_KEYS',
        message: PHONE_REPLACED,
      });
      expect(h.wipe).toHaveBeenCalledTimes(1);
    }
  });

  it('a wipe failure still lands on Pair', async () => {
    const h = harness({ me: new BiometricSignerError('KEY_INVALIDATED') });
    h.wipe.mockRejectedValueOnce(new Error('keystore busy'));
    expect(await resolveLaunchRoute(h.deps)).toMatchObject({
      name: 'Pair',
      reason: 'KEY_INVALIDATED',
    });
  });

  it('server not reachable → Home offline with the stored record and no status', async () => {
    const h = harness({ me: new NotReachable('TIMEOUT') });
    expect(await resolveLaunchRoute(h.deps)).toEqual({
      name: 'Home',
      pairing: RECORD,
      status: null,
      offline: true,
    });
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('another refusal or an unexpected error → Home online, the home screen shows it', async () => {
    for (const error of [
      new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS),
      new Error('unexpected'),
    ]) {
      const h = harness({ me: error });
      expect(await resolveLaunchRoute(h.deps)).toEqual({
        name: 'Home',
        pairing: RECORD,
        status: null,
        offline: false,
      });
      expect(h.wipe).not.toHaveBeenCalled();
    }
  });

  it('a store without updateLocation, or one whose update fails, still gets the fresh settings in the route', async () => {
    const without = harness({ withUpdateLocation: false });
    expect(await resolveLaunchRoute(without.deps)).toMatchObject({
      name: 'Home',
      pairing: { location: ME.location },
    });
    const failing = harness({});
    failing.updateLocation.mockRejectedValueOnce(new Error('secure store busy'));
    expect(await resolveLaunchRoute(failing.deps)).toMatchObject({
      name: 'Home',
      pairing: { location: ME.location },
    });
  });
});
