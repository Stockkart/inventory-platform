import { describe, expect, it, vi } from 'vitest';

import { SERVER_MESSAGES } from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { BiometricSignerError } from '../signer/BiometricSigner';
import { agreeReconsent } from './reconsent';

function harness(answer: { agreedVersion: number; at: string } | Error) {
  const postConsent = vi.fn(async (_version: number) => {
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  });
  const updateConsentVersion = vi.fn(async (_version: number) => undefined);
  const wipe = vi.fn(async () => undefined);
  return {
    deps: { client: { postConsent }, pairingStore: { updateConsentVersion, wipe } },
    postConsent,
    updateConsentVersion,
    wipe,
  };
}

describe('agreeReconsent', () => {
  it('posts the version and stores what the server recorded (R9.13)', async () => {
    const h = harness({ agreedVersion: 2, at: '2025-04-03T03:42:08Z' });
    expect(await agreeReconsent(h.deps, 2)).toEqual({ kind: 'agreed', version: 2 });
    expect(h.postConsent).toHaveBeenCalledWith(2);
    expect(h.updateConsentVersion).toHaveBeenCalledWith(2);
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('not reachable → nothing stored, the screen may retry', async () => {
    const h = harness(new NotReachable('TIMEOUT'));
    expect(await agreeReconsent(h.deps, 2)).toEqual({ kind: 'not_reachable' });
    expect(h.updateConsentVersion).not.toHaveBeenCalled();
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('the pairing ended meanwhile → wipe and report the message', async () => {
    const refusal = new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    const h = harness(refusal);
    expect(await agreeReconsent(h.deps, 2)).toEqual({
      kind: 'not_paired',
      message: refusal.message,
    });
    expect(h.wipe).toHaveBeenCalledTimes(1);

    const invalidated = harness(new BiometricSignerError('KEY_INVALIDATED'));
    expect(await agreeReconsent(invalidated.deps, 2)).toMatchObject({ kind: 'not_paired' });
    expect(invalidated.wipe).toHaveBeenCalledTimes(1);
  });

  it('another refusal is reported word for word and changes nothing', async () => {
    const h = harness(new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS));
    expect(await agreeReconsent(h.deps, 2)).toEqual({
      kind: 'refused',
      message: SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS,
    });
    expect(h.updateConsentVersion).not.toHaveBeenCalled();
    expect(h.wipe).not.toHaveBeenCalled();
  });
});
