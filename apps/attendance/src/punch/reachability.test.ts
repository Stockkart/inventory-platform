import { describe, expect, it, vi } from 'vitest';

import { NoPairing, NotReachable, ServerRefusal } from '../api/appClient';
import { ALWAYS_REACHABLE, serverReachability } from './reachability';

describe('serverReachability (R6.1)', () => {
  it('"no network" from the phone answers false without asking the server', async () => {
    const getMe = vi.fn(async () => ({}));
    const probe = serverReachability({ client: { getMe }, network: async () => false });
    expect(await probe.probe()).toBe(false);
    expect(getMe).not.toHaveBeenCalled();
  });

  it('a connected or unknown network goes on to GET /me; an answer means reachable', async () => {
    const getMe = vi.fn(async () => ({}));
    const probe = serverReachability({ client: { getMe }, network: async () => true });
    expect(await probe.probe()).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['TIMEOUT', new NotReachable('TIMEOUT')],
    ['CONNECTION', new NotReachable('CONNECTION')],
    ['SERVER_ERROR', new NotReachable('SERVER_ERROR', 503)],
    ['BAD_ANSWER', new NotReachable('BAD_ANSWER', 200)],
  ] as const)('NotReachable (%s) from /me answers false', async (_name, error) => {
    const probe = serverReachability({
      client: {
        getMe: async () => {
          throw error;
        },
      },
    });
    expect(await probe.probe()).toBe(false);
  });

  it('a refusal or any other error from /me is an answer: reachable, the send shows the real result', async () => {
    for (const error of [
      new ServerRefusal(403, 'This phone is no longer paired. Ask your manager.'),
      new ServerRefusal(409, 'Your shop has not turned on the Attendance app.'),
      new NoPairing(),
      new Error('signer broke'),
    ]) {
      const probe = serverReachability({
        client: {
          getMe: async () => {
            throw error;
          },
        },
      });
      expect(await probe.probe()).toBe(true);
    }
  });

  it('a failing network reader is not "no network": the server decides', async () => {
    const getMe = vi.fn(async () => ({}));
    const probe = serverReachability({
      client: { getMe },
      network: async () => {
        throw new Error('NetInfo unavailable');
      },
    });
    expect(await probe.probe()).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it('ALWAYS_REACHABLE is the online-only stand-in', async () => {
    expect(await ALWAYS_REACHABLE.probe()).toBe(true);
  });
});
