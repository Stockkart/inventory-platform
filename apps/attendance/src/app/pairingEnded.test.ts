import { describe, expect, it, vi } from 'vitest';

import {
  KEY_INVALIDATED,
  PHONE_REPLACED,
  SERVER_MESSAGES,
} from '@inventory-platform/attendance-protocol';

import { NoPairing, NotReachable, ServerRefusal } from '../api/appClient';
import { BiometricSignerError } from '../signer/BiometricSigner';
import { endPairingIf, pairingEndedBy } from './pairingEnded';

describe('pairingEndedBy', () => {
  it('classifies the three ways a pairing ends', () => {
    const notPaired = new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    expect(pairingEndedBy(notPaired)).toEqual({ reason: 'NOT_PAIRED', message: notPaired.message });
    expect(pairingEndedBy(new BiometricSignerError('KEY_INVALIDATED'))).toEqual({
      reason: 'KEY_INVALIDATED',
      message: KEY_INVALIDATED,
    });
    expect(pairingEndedBy(new BiometricSignerError('NO_KEYS'))).toEqual({
      reason: 'NO_KEYS',
      message: PHONE_REPLACED,
    });
    expect(pairingEndedBy(new NoPairing())).toEqual({ reason: 'NO_KEYS', message: PHONE_REPLACED });
  });

  it('leaves every other error to the caller', () => {
    for (const error of [
      new NotReachable('TIMEOUT'),
      new ServerRefusal(409, SERVER_MESSAGES.HR_APP_OFF),
      new BiometricSignerError('BIOMETRIC_CANCELLED'),
      new BiometricSignerError('BIOMETRIC_LOCKED_OUT'),
      new Error('other'),
      null,
      'text',
    ]) {
      expect(pairingEndedBy(error)).toBeNull();
    }
  });
});

describe('endPairingIf', () => {
  it('wipes when the pairing ended and returns the message; otherwise touches nothing', async () => {
    const wipe = vi.fn(async () => undefined);
    expect(await endPairingIf(new BiometricSignerError('KEY_INVALIDATED'), { wipe })).toEqual({
      reason: 'KEY_INVALIDATED',
      message: KEY_INVALIDATED,
    });
    expect(wipe).toHaveBeenCalledTimes(1);

    expect(await endPairingIf(new NotReachable('CONNECTION'), { wipe })).toBeNull();
    expect(wipe).toHaveBeenCalledTimes(1);
  });

  it('a failing wipe is still reported as ended, with the wipe error attached', async () => {
    const boom = new Error('keystore busy');
    const wipe = vi.fn(async () => {
      throw boom;
    });
    expect(await endPairingIf(new NoPairing(), { wipe })).toEqual({
      reason: 'NO_KEYS',
      message: PHONE_REPLACED,
      wipeError: boom,
    });
  });
});
