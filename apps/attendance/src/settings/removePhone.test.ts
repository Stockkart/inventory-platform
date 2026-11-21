import { describe, expect, it, vi } from 'vitest';

import { SERVER_MESSAGES, UNPAIR_NEEDS_NETWORK } from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { removePhone } from './removePhone';

function harness(answer: { unpaired: boolean } | Error) {
  const order: string[] = [];
  const unpairMe = vi.fn(async () => {
    order.push('unpair');
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  });
  const wipe = vi.fn(async () => {
    order.push('wipe');
  });
  return { deps: { client: { unpairMe }, pairingStore: { wipe } }, unpairMe, wipe, order };
}

describe('removePhone', () => {
  it('server reachable → unpair on the server first, then wipe (R3.7)', async () => {
    const h = harness({ unpaired: true });
    expect(await removePhone(h.deps)).toEqual({ kind: 'unpaired' });
    expect(h.order).toEqual(['unpair', 'wipe']);
  });

  it('server not reachable → UNPAIR_NEEDS_NETWORK, nothing deleted, still paired (R3.8)', async () => {
    for (const reason of ['TIMEOUT', 'CONNECTION', 'SERVER_ERROR'] as const) {
      const h = harness(new NotReachable(reason));
      expect(await removePhone(h.deps)).toEqual({
        kind: 'not_reachable',
        message: UNPAIR_NEEDS_NETWORK,
      });
      expect(h.wipe).not.toHaveBeenCalled();
    }
  });

  it('the server says the pairing is already gone → wipe anyway and report unpaired', async () => {
    const h = harness(new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED));
    expect(await removePhone(h.deps)).toEqual({ kind: 'unpaired' });
    expect(h.wipe).toHaveBeenCalledTimes(1);
  });

  it('another refusal keeps the data and shows the server’s text', async () => {
    const h = harness(new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS));
    expect(await removePhone(h.deps)).toEqual({
      kind: 'failed',
      message: SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS,
    });
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('a local wipe failure after a server unpair is still reported as unpaired, with the error', async () => {
    const h = harness({ unpaired: true });
    const boom = new Error('keystore busy');
    h.wipe.mockRejectedValueOnce(boom);
    expect(await removePhone(h.deps)).toEqual({ kind: 'unpaired', wipeError: boom });
  });

  it('an unexpected error is rethrown and nothing is deleted', async () => {
    const h = harness(new TypeError('boom'));
    await expect(removePhone(h.deps)).rejects.toThrow('boom');
    expect(h.wipe).not.toHaveBeenCalled();
  });
});
