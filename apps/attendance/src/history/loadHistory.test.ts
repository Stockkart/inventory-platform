import { describe, expect, it, vi } from 'vitest';

import {
  KEY_INVALIDATED,
  PHONE_REPLACED,
  SERVER_MESSAGES,
} from '@inventory-platform/attendance-protocol';
import type { PunchResponse } from '@inventory-platform/attendance-protocol';

import { NoPairing, NotReachable, ServerRefusal } from '../api/appClient';
import { MemoryDatabase } from '../queue/memoryDb';
import { BiometricSignerError } from '../signer/BiometricSigner';
import { HistoryCache } from './HistoryCache';
import { loadHistory } from './loadHistory';

// 2025-04-03 09:12 IST
const NOW = Date.UTC(2025, 3, 3, 3, 42, 0);

function punch(id: string, at: string, extra: Partial<PunchResponse> = {}): PunchResponse {
  return {
    id,
    employeeId: '5f1a2b3c4d5e6f7081920002',
    at,
    source: 'BIOMETRIC_APP',
    direction: 'IN',
    flags: [],
    counted: true,
    ...extra,
  };
}

function harness(answers: Array<PunchResponse[] | Error>) {
  const getPunches = vi.fn(async (_from: string, _to: string) => {
    const next = answers.shift();
    if (next === undefined) {
      throw new Error('no scripted answer');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  const cache = new HistoryCache(new MemoryDatabase(), { now: () => NOW });
  return { getPunches, cache, deps: { client: { getPunches }, cache, now: () => NOW } };
}

describe('loadHistory', () => {
  it('asks the server for the 31-day window and replaces the cache with the answer, newest first', async () => {
    const h = harness([
      [
        punch('a', '2025-04-01T04:00:00Z'),
        punch('b', '2025-04-03T03:40:00Z', { direction: 'OUT' }),
      ],
    ]);

    const load = await loadHistory(h.deps);

    expect(h.getPunches).toHaveBeenCalledWith('2025-03-04', '2025-04-03');
    expect(load.kind).toBe('server');
    if (load.kind !== 'server') {
      return;
    }
    expect(load.entries.map((e) => e.punchId)).toEqual(['b', 'a']);
    expect(load.entries[0]).toMatchObject({
      localDate: '2025-04-03',
      localTime: '09:10',
      direction: 'OUT',
    });
    expect((await h.cache.list()).map((e) => e.punchId)).toEqual(['b', 'a']);
  });

  it('every open reads the server again (R4.10): a second call replaces what the first stored', async () => {
    const h = harness([[punch('a', '2025-04-01T04:00:00Z')], [punch('z', '2025-04-02T04:00:00Z')]]);
    await loadHistory(h.deps);
    const second = await loadHistory(h.deps);
    expect(h.getPunches).toHaveBeenCalledTimes(2);
    expect(second.kind === 'server' && second.entries.map((e) => e.punchId)).toEqual(['z']);
    expect((await h.cache.list()).map((e) => e.punchId)).toEqual(['z']);
  });

  it('shows the pruned cache when the server is not reachable', async () => {
    const h = harness([
      [punch('old', '2025-03-05T04:00:00Z'), punch('new', '2025-04-03T03:00:00Z')],
      new NotReachable('TIMEOUT'),
    ]);
    await loadHistory(h.deps);
    // 10 days later: 'old' (5 Mar) has left the window, 'new' has not.
    const later = NOW + 10 * 24 * 60 * 60 * 1000;
    const load = await loadHistory({ ...h.deps, now: () => later });
    expect(load).toMatchObject({ kind: 'cache', from: '2025-03-14', to: '2025-04-13' });
    expect(load.kind === 'cache' && load.entries.map((e) => e.punchId)).toEqual(['new']);
  });

  it('an empty answer gives an empty list and an empty cache', async () => {
    const h = harness([[punch('a', '2025-04-01T04:00:00Z')], []]);
    await loadHistory(h.deps);
    const load = await loadHistory(h.deps);
    expect(load.kind === 'server' && load.entries).toEqual([]);
    expect(await h.cache.count()).toBe(0);
  });

  it('HR_APP_NOT_PAIRED, no pairing, missing keys and an invalidated key all end the pairing', async () => {
    const notPaired = new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    for (const [error, message] of [
      [notPaired, notPaired.message],
      [new NoPairing(), PHONE_REPLACED],
      [new BiometricSignerError('NO_KEYS'), PHONE_REPLACED],
      [new BiometricSignerError('KEY_INVALIDATED'), KEY_INVALIDATED],
    ] as const) {
      const h = harness([error]);
      expect(await loadHistory(h.deps)).toEqual({ kind: 'not_paired', message });
    }
  });

  it('another refusal is shown with the cached copy', async () => {
    const h = harness([
      [punch('a', '2025-04-01T04:00:00Z')],
      new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS),
    ]);
    await loadHistory(h.deps);
    const load = await loadHistory(h.deps);
    expect(load).toMatchObject({ kind: 'refused', message: SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS });
    expect(load.kind === 'refused' && load.entries.map((e) => e.punchId)).toEqual(['a']);
  });

  it('an unexpected error is rethrown', async () => {
    const h = harness([new TypeError('boom')]);
    await expect(loadHistory(h.deps)).rejects.toThrow('boom');
  });
});
