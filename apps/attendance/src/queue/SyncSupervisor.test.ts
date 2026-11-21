import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppPunchRequest, AppPunchResponse } from '@inventory-platform/attendance-protocol';

import { ServerRefusal } from '../api/appClient';
import { MemoryDatabase } from './memoryDb';
import { PunchQueue } from './PunchQueue';
import { SyncSupervisor } from './SyncSupervisor';
import { SyncWorker, type QueueState } from './SyncWorker';

const NOT_PAIRED = 'This phone is no longer paired. Ask your manager.';

function request(n: number): AppPunchRequest {
  return {
    pairingId: '66a1b2c3d4e5f60718293a4b',
    shopId: '66a1b2c3d4e5f60718293a4c',
    employeeId: '66a1b2c3d4e5f60718293a4d',
    punchId: `0f6b2c1e-9c4a-4a5e-8f1d-${String(n).padStart(12, '0')}`,
    phoneTime: `2025-04-03T03:${String(n).padStart(2, '0')}:00Z`,
    offline: true,
    locationChecked: false,
    distanceMetres: null,
    accuracyMetres: null,
    mock: false,
    signature: `sig-${n}`,
  };
}

const STORED: AppPunchResponse = {
  outcome: 'STORED',
  direction: 'IN',
  at: '2025-04-03T03:42:00Z',
  atLocal: '09:12',
  flags: ['RECORDED_OFFLINE'],
  duplicate: false,
  todayIn: '09:12',
  todayOut: null,
  nextDirection: 'OUT',
};

describe('SyncSupervisor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces a worker that ended its pairing, keeps subscribers attached and keeps sending', async () => {
    const queue = new PunchQueue(new MemoryDatabase());
    const answers: Array<AppPunchResponse | Error> = [new ServerRefusal(403, NOT_PAIRED), STORED];
    const calls: AppPunchRequest[] = [];
    const client = {
      async postPunch(req: AppPunchRequest): Promise<AppPunchResponse> {
        calls.push(req);
        const next = answers.shift();
        if (next instanceof Error) {
          throw next;
        }
        if (!next) {
          throw new Error('no scripted answer');
        }
        return next;
      },
    };
    let wipes = 0;
    // On the phone `PairingStore.wipe()` deletes the SQLite file (R3.3, R9.6); here the queue is
    // emptied instead, so the replacement worker starts over an empty queue as it would there.
    const pairingStore = {
      async wipe() {
        wipes++;
        await queue.clear();
      },
    };
    const ended: unknown[] = [];
    const states: QueueState[] = [];

    const supervisor = new SyncSupervisor({
      create: (onPairingEnded) =>
        new SyncWorker({ queue, client, pairingStore, onPairingEnded, clock: Date.now }),
      onPairingEnded: (e) => ended.push(e),
    });
    supervisor.subscribe((s) => states.push(s));
    const first = supervisor.current;

    await queue.enqueue(request(1), 'IN');
    await supervisor.start();
    await vi.advanceTimersByTimeAsync(10);

    // The first worker hit HR_APP_NOT_PAIRED: wiped, reported, replaced.
    expect(calls).toHaveLength(1);
    expect(wipes).toBe(1);
    expect(ended).toHaveLength(1);
    expect(first.isRunning).toBe(false);
    expect(supervisor.current).not.toBe(first);
    expect(supervisor.workersSpawned).toBe(2);
    expect(supervisor.current.isRunning).toBe(true);

    // The phone is paired again and a new punch is queued: the replacement sends it.
    await queue.enqueue(request(2), 'IN');
    await supervisor.queueChanged();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(calls).toHaveLength(2);
    expect(calls[1].punchId).toBe(request(2).punchId);

    // The subscriber kept receiving states across the replacement.
    expect(states.length).toBeGreaterThan(1);
    expect(states.at(-1)).toMatchObject({ waiting: 0 });
  });

  it('dismissRefused and queueChanged go to the current worker', async () => {
    const queue = new PunchQueue(new MemoryDatabase());
    const client = {
      async postPunch(): Promise<AppPunchResponse> {
        throw new ServerRefusal(409, 'You are on approved leave today');
      },
    };
    const supervisor = new SyncSupervisor({
      create: (onPairingEnded) =>
        new SyncWorker({
          queue,
          client,
          pairingStore: { wipe: async () => undefined },
          onPairingEnded,
        }),
    });
    await queue.enqueue(request(1), 'IN');
    await supervisor.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(supervisor.current.state.refused).toHaveLength(1);
    expect(await supervisor.dismissRefused(request(1).punchId)).toBe(true);
    expect(supervisor.current.state.refused).toHaveLength(0);
    supervisor.stop();
    expect(supervisor.current.isRunning).toBe(false);
  });
});
