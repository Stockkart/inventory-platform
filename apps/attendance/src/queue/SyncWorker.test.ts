import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppPunchRequest, AppPunchResponse } from '@inventory-platform/attendance-protocol';

import { NoPairing, NotReachable, ServerRefusal } from '../api/appClient';
import { HistoryCache } from '../history/HistoryCache';
import { MemoryDatabase } from './memoryDb';
import { PunchQueue } from './PunchQueue';
import {
  MAX_RETRY_WAIT_MS,
  MIN_ATTEMPT_GAP_MS,
  SyncWorker,
  historyEntryFor,
  retryWaitMs,
  type QueueState,
  type Triggers,
} from './SyncWorker';

const PAIRING = '66a1b2c3d4e5f60718293a4b';
const SHOP = '66a1b2c3d4e5f60718293a4c';
const EMPLOYEE = '66a1b2c3d4e5f60718293a4d';
const MINUTE = 60_000;

// 2025-04-03 09:00 IST = 03:30 UTC
const START = Date.UTC(2025, 3, 3, 3, 30, 0);

function request(n: number): AppPunchRequest {
  return {
    pairingId: PAIRING,
    shopId: SHOP,
    employeeId: EMPLOYEE,
    punchId: `0f6b2c1e-9c4a-4a5e-8f1d-${String(n).padStart(12, '0')}`,
    phoneTime: `2025-04-03T03:${String(n).padStart(2, '0')}:00Z`,
    offline: true,
    locationChecked: true,
    distanceMetres: 12,
    accuracyMetres: 8,
    mock: false,
    signature: `sig-${n}`,
  };
}

function stored(overrides: Partial<AppPunchResponse> = {}): AppPunchResponse {
  return {
    outcome: 'STORED',
    direction: 'IN',
    at: '2025-04-03T03:42:00Z',
    atLocal: '09:12',
    flags: ['RECORDED_OFFLINE'],
    duplicate: false,
    todayIn: '09:12',
    todayOut: null,
    nextDirection: 'OUT',
    ...overrides,
  };
}

/** One scripted answer of the fake server. */
type Answer =
  | { kind: 'ok'; response?: AppPunchResponse }
  | { kind: 'refuse'; status: number; message: string }
  | { kind: 'not_reachable'; reason?: 'TIMEOUT' | 'CONNECTION' | 'SERVER_ERROR' }
  | { kind: 'hang' }
  | { kind: 'throw'; error: unknown };

/**
 * A fake `AppClient.postPunch` that answers from a script, in order, and records every request.
 * `hang` leaves the request open until `release()` is called.
 */
class FakeClient {
  readonly calls: AppPunchRequest[] = [];
  readonly callTimes: number[] = [];
  private pending: ((answer: Answer) => void) | null = null;

  constructor(private readonly script: Answer[] = []) {}

  get inFlight(): boolean {
    return this.pending !== null;
  }

  postPunch(request: AppPunchRequest): Promise<AppPunchResponse> {
    this.calls.push(request);
    this.callTimes.push(Date.now());
    const answer = this.script.shift() ?? { kind: 'ok' as const };
    if (answer.kind === 'hang') {
      return new Promise((resolve, reject) => {
        this.pending = (later) => {
          this.pending = null;
          this.settle(later).then(resolve, reject);
        };
      });
    }
    return this.settle(answer);
  }

  /** Answers the hanging request. */
  release(answer: Answer = { kind: 'ok' }): void {
    if (!this.pending) {
      throw new Error('no request in flight');
    }
    this.pending(answer);
  }

  private async settle(answer: Answer): Promise<AppPunchResponse> {
    switch (answer.kind) {
      case 'ok':
        return answer.response ?? stored();
      case 'refuse':
        throw new ServerRefusal(answer.status, answer.message);
      case 'not_reachable':
        throw new NotReachable(answer.reason ?? 'TIMEOUT');
      case 'throw':
        throw answer.error;
      case 'hang':
        throw new Error('unreachable');
    }
  }
}

class FakeTriggers implements Triggers {
  private networkListener: (() => void) | null = null;
  private foregroundListener: (() => void) | null = null;
  private backgroundRun: (() => Promise<void>) | null = null;
  unsubscribed = 0;

  get subscribed(): boolean {
    return this.networkListener !== null;
  }

  onNetworkConnected(listener: () => void) {
    this.networkListener = listener;
    return () => {
      this.networkListener = null;
      this.unsubscribed += 1;
    };
  }

  onForeground(listener: () => void) {
    this.foregroundListener = listener;
    return () => {
      this.foregroundListener = null;
      this.unsubscribed += 1;
    };
  }

  onBackgroundRun(run: () => Promise<void>) {
    this.backgroundRun = run;
    return () => {
      this.backgroundRun = null;
      this.unsubscribed += 1;
    };
  }

  /** Fires "network is back". */
  network(): void {
    subscribed(this.networkListener)();
  }

  /** Fires "app came to the foreground". */
  foreground(): void {
    subscribed(this.foregroundListener)();
  }

  /** Runs the background task as the OS would. */
  background(): Promise<void> {
    return subscribed(this.backgroundRun)();
  }
}

function subscribed<T>(listener: T | null): T {
  if (listener === null) {
    throw new Error('the worker is not subscribed to this trigger');
  }
  return listener;
}

/** Narrows a nullable value or fails the test. */
function present<T>(value: T | null | undefined): T {
  expect(value).not.toBeNull();
  expect(value).toBeDefined();
  return value as T;
}

function setup(script: Answer[] = [], options: { history?: boolean } = {}) {
  const db = new MemoryDatabase();
  const queue = new PunchQueue(db, { now: () => Date.now() });
  const client = new FakeClient(script);
  const triggers = new FakeTriggers();
  const history = options.history ? new HistoryCache(db, { now: () => Date.now() }) : undefined;
  const wipes: number[] = [];
  const states: QueueState[] = [];
  const ended: unknown[] = [];
  const errors: unknown[] = [];
  const worker = new SyncWorker({
    queue,
    client,
    pairingStore: {
      wipe: async () => {
        wipes.push(Date.now());
      },
    },
    clock: () => Date.now(),
    triggers,
    history,
    onChange: (state) => states.push(state),
    onPairingEnded: (e) => ended.push(e),
    onError: (e) => errors.push(e),
  });
  return { db, queue, client, triggers, history, worker, wipes, states, ended, errors };
}

/** Lets the worker's promise chains settle without moving the clock. */
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('retryWaitMs', () => {
  it('is 1, 2, 4, 8 minutes, then 15 minutes for every later failure (R6.15)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(retryWaitMs)).toEqual(
      [1, 2, 4, 8, 15, 15, 15, 15].map((m) => m * MINUTE),
    );
    expect(retryWaitMs(1_000)).toBe(MAX_RETRY_WAIT_MS);
  });

  it('refuses a count below 1', () => {
    expect(() => retryWaitMs(0)).toThrow();
    expect(() => retryWaitMs(1.5)).toThrow();
  });
});

describe('SyncWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('triggers and the 60 s floor', () => {
    it('start publishes the queue state and attempts at once when rows wait', async () => {
      const { queue, client, worker, states } = setup();
      await queue.enqueue(request(1), 'IN');

      await worker.start();
      await flush();

      expect(worker.lastAttemptTrigger).toBe('start');
      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId]);
      expect(client.callTimes[0] - START).toBeLessThanOrEqual(5_000);
      // Published once with the row waiting, then once more when it was sent.
      expect(states.map((s) => s.waiting)).toEqual([1, 0]);
      expect(worker.state).toEqual({ waiting: 0, refused: [], newestDirection: null });
    });

    it('a network trigger starts an attempt within 5 s (R6.6)', async () => {
      const { queue, client, triggers, worker } = setup();
      await worker.start();
      await flush();
      expect(client.calls).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(10 * MINUTE);
      await queue.enqueue(request(1), 'IN');
      const before = Date.now();
      triggers.network();
      await vi.advanceTimersByTimeAsync(5_000);

      expect(client.calls).toHaveLength(1);
      expect(client.callTimes[0] - before).toBeLessThanOrEqual(5_000);
      expect(worker.lastAttemptTrigger).toBe('network');
    });

    it('two triggers within 60 s make one attempt, and the second waits out the floor (R6.6, R6.15)', async () => {
      const { queue, client, triggers, worker } = setup([{ kind: 'not_reachable' }]);
      await queue.enqueue(request(1), 'IN');
      await worker.start(); // attempt 1 at START: no answer → row backs off 1 min
      await flush();
      expect(worker.attempts).toBe(1);

      await vi.advanceTimersByTimeAsync(10_000);
      triggers.network();
      await vi.advanceTimersByTimeAsync(10_000);
      triggers.foreground();
      await flush();
      expect(worker.attempts).toBe(1);

      // The floor ends 60 s after attempt 1 started; the folded attempt runs then, not before.
      await vi.advanceTimersByTimeAsync(MIN_ATTEMPT_GAP_MS - 20_000 - 1);
      expect(worker.attempts).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      await flush();
      expect(worker.attempts).toBe(2);
      expect(client.callTimes[1] - client.callTimes[0]).toBe(MIN_ATTEMPT_GAP_MS);
    });

    it('a trigger arriving during an attempt is folded into one follow-up after the floor', async () => {
      const { queue, client, triggers, worker } = setup([{ kind: 'hang' }]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();
      expect(client.inFlight).toBe(true);

      triggers.network();
      triggers.foreground();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(worker.attempts).toBe(1);

      await queue.enqueue(request(2), 'OUT');
      client.release({ kind: 'ok' });
      await flush();
      // Row 2 was already due, so attempt 1 sent it right after row 1's answer (R6.5).
      expect(client.calls).toHaveLength(2);
      // The folded follow-up still runs once the floor has passed, finding nothing to send.
      await vi.advanceTimersByTimeAsync(MIN_ATTEMPT_GAP_MS);
      expect(worker.attempts).toBe(2);
      expect(client.calls).toHaveLength(2);
    });

    it('the background run resolves when the attempt has finished, and is a no-op inside the floor', async () => {
      const { queue, client, triggers, worker } = setup();
      await worker.start();
      await flush();

      await queue.enqueue(request(1), 'IN');
      // Inside the 60 s floor after the start attempt: nothing is sent, the promise resolves.
      await triggers.background();
      expect(client.calls).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(MIN_ATTEMPT_GAP_MS);
      const run = triggers.background();
      await flush();
      await run;
      expect(client.calls).toHaveLength(1);
      expect(worker.lastAttemptTrigger).toBe('background');
      expect(worker.isAttempting).toBe(false);
    });

    it('stop unsubscribes from every trigger and cancels the retry timer', async () => {
      const { queue, client, triggers, worker } = setup([{ kind: 'not_reachable' }]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();
      expect(worker.isRunning).toBe(true);

      worker.stop();
      expect(worker.isRunning).toBe(false);
      expect(triggers.unsubscribed).toBe(3);
      expect(triggers.subscribed).toBe(false);

      await vi.advanceTimersByTimeAsync(30 * MINUTE);
      expect(client.calls).toHaveLength(1);
    });
  });

  describe('one request at a time, oldest first (R6.5, R6.15)', () => {
    it('sends rows in phone-time order, each only after the previous answer', async () => {
      const { queue, client, worker } = setup([{ kind: 'hang' }, { kind: 'hang' }, { kind: 'ok' }]);
      await queue.enqueue(request(3), 'IN');
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await worker.start();
      await flush();

      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId]);
      expect(client.inFlight).toBe(true);
      await vi.advanceTimersByTimeAsync(5 * MINUTE);
      expect(client.calls).toHaveLength(1); // nothing else while one is in flight

      client.release();
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId, request(2).punchId]);

      client.release();
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([
        request(1).punchId,
        request(2).punchId,
        request(3).punchId,
      ]);
      expect(await queue.waitingCount()).toBe(0);
      expect(worker.isAttempting).toBe(false);
    });

    it('a punch saved during an attempt is sent in the same attempt, after the rows before it', async () => {
      const { queue, client, worker } = setup([{ kind: 'hang' }]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();

      await queue.enqueue(request(5), 'OUT');
      await worker.queueChanged();
      expect(worker.state.waiting).toBe(2);
      expect(worker.state.newestDirection).toBe('OUT');

      client.release();
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId, request(5).punchId]);
      expect(worker.state.waiting).toBe(0);
    });
  });

  describe('answers (R6.7, R6.13–R6.15, R3.3)', () => {
    it('stored, duplicate and replayed delete the row and record it in the history cache', async () => {
      const { queue, client, worker, history } = setup(
        [
          { kind: 'ok', response: stored() },
          {
            kind: 'ok',
            response: stored({
              outcome: 'DUPLICATE',
              duplicate: true,
              at: '2025-04-03T03:43:00Z',
              atLocal: '09:13',
              flags: [],
            }),
          },
          {
            kind: 'ok',
            response: stored({
              outcome: 'REPLAYED',
              direction: 'OUT',
              at: '2025-04-03T12:35:00Z',
              atLocal: '18:05',
            }),
          },
        ],
        { history: true },
      );
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'IN');
      await queue.enqueue(request(3), 'OUT');
      await worker.start();
      await flush();

      expect(client.calls).toHaveLength(3);
      expect(await queue.waitingCount()).toBe(0);
      expect(await queue.refused()).toEqual([]);
      expect(await queue.get(request(1).punchId)).toBeNull();

      const entries = await present(history).list();
      expect(entries.map((e) => [e.punchId, e.localTime, e.direction, e.counted, e.flags])).toEqual(
        [
          [request(3).punchId, '18:05', 'OUT', true, ['RECORDED_OFFLINE']],
          [request(2).punchId, '09:13', 'IN', false, []],
          [request(1).punchId, '09:12', 'IN', true, ['RECORDED_OFFLINE']],
        ],
      );
      expect(entries[0].localDate).toBe('2025-04-03');
    });

    it('a refusal turns the row REFUSED with the message, is not retried, and the next row goes on', async () => {
      const { queue, client, worker, states } = setup([
        { kind: 'refuse', status: 409, message: 'You are on approved leave today' },
        { kind: 'ok' },
      ]);
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await worker.start();
      await flush();

      expect(client.calls).toHaveLength(2);
      const refused = await queue.refused();
      expect(refused.map((r) => [r.punchId, r.refusalMessage])).toEqual([
        [request(1).punchId, 'You are on approved leave today'],
      ]);
      expect(await queue.waitingCount()).toBe(0);
      expect(worker.state).toEqual({ waiting: 0, refused, newestDirection: null });
      expect(present(states.at(-1)).refused).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(60 * MINUTE);
      expect(client.calls).toHaveLength(2);

      // OK on the card deletes it (R6.14).
      expect(await worker.dismissRefused(request(1).punchId)).toBe(true);
      expect(worker.state.refused).toEqual([]);
      expect(await queue.get(request(1).punchId)).toBeNull();
    });

    it('a refused row from an earlier run is shown again on the next start and never re-sent (R6.13)', async () => {
      // First run: the server refused the punch; the app is then closed without tapping OK.
      const first = setup([
        { kind: 'refuse', status: 422, message: 'Too late to send this check-in' },
      ]);
      await first.queue.enqueue(request(1), 'IN');
      await first.worker.start();
      await flush();
      first.worker.stop();
      expect(first.worker.state.refused).toHaveLength(1);

      // Reopen: a new worker over the same database, same as a fresh process start.
      const client = new FakeClient();
      const states: QueueState[] = [];
      const reopened = new SyncWorker({
        queue: new PunchQueue(first.db, { now: () => Date.now() }),
        client,
        pairingStore: { wipe: async () => undefined },
        clock: () => Date.now(),
        triggers: new FakeTriggers(),
        onChange: (state) => states.push(state),
      });
      await reopened.start();
      await flush();
      await vi.advanceTimersByTimeAsync(60 * MINUTE);

      expect(client.calls).toEqual([]);
      expect(reopened.state.waiting).toBe(0);
      expect(reopened.state.refused.map((r) => [r.punchId, r.refusalMessage])).toEqual([
        [request(1).punchId, 'Too late to send this check-in'],
      ]);
      expect(present(states[0]).refused).toHaveLength(1);
      // Only OK removes it (R6.14).
      expect(await reopened.dismissRefused(request(1).punchId)).toBe(true);
      expect(reopened.state.refused).toEqual([]);
    });

    it('HR_APP_NOT_PAIRED wipes the phone, reports the end of the pairing and stops for good', async () => {
      const { queue, client, triggers, worker, wipes, ended } = setup([
        {
          kind: 'refuse',
          status: 403,
          message: 'This phone is no longer paired. Ask your manager.',
        },
      ]);
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await worker.start();
      await flush();

      expect(client.calls).toHaveLength(1);
      expect(wipes).toHaveLength(1);
      expect(ended).toHaveLength(1);
      expect(ended[0]).toMatchObject({ reason: 'NOT_PAIRED' });
      expect((ended[0] as { message: string }).message).toContain('This phone is no longer paired');
      expect(worker.isRunning).toBe(false);
      expect(triggers.unsubscribed).toBe(3);
      expect(worker.state).toEqual({ waiting: 0, refused: [], newestDirection: null });

      // Nothing more is sent, by trigger, timer or restart.
      await vi.advanceTimersByTimeAsync(30 * MINUTE);
      await worker.start();
      await worker.queueChanged();
      await vi.advanceTimersByTimeAsync(30 * MINUTE);
      expect(client.calls).toHaveLength(1);
      expect(wipes).toHaveLength(1);
    });

    it('a missing pairing or dead key ends the pairing the same way', async () => {
      const { queue, client, worker, wipes, ended } = setup([
        { kind: 'throw', error: new NoPairing() },
      ]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();

      expect(client.calls).toHaveLength(1);
      expect(wipes).toHaveLength(1);
      expect(ended[0]).toMatchObject({ reason: 'NO_KEYS' });
    });

    it('no answer backs the row off 1, 2, 4, 8, 15, 15 minutes and retries when due (R6.15)', async () => {
      const { queue, client, worker } = setup(
        Array.from({ length: 7 }, () => ({ kind: 'not_reachable' as const })),
      );
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();
      expect(client.calls).toHaveLength(1);

      const waits = [1, 2, 4, 8, 15, 15];
      for (const [i, minutes] of waits.entries()) {
        const row = present(await queue.get(request(1).punchId));
        expect(row.state).toBe('WAITING');
        expect(row.attempts).toBe(i + 1);
        expect(row.nextAttemptAt - client.callTimes[i]).toBe(minutes * MINUTE);

        await vi.advanceTimersByTimeAsync(minutes * MINUTE - 1);
        expect(client.calls).toHaveLength(i + 1);
        await vi.advanceTimersByTimeAsync(1);
        await flush();
        expect(client.calls).toHaveLength(i + 2);
        expect(worker.lastAttemptTrigger).toBe('retry');
      }
      // The row is still there: it leaves only on an answer (R6.7).
      expect(await queue.waitingCount()).toBe(1);
      expect(worker.state.waiting).toBe(1);
    });

    it('a 5xx and a connection error are "no answer" too, and the head blocks the rows behind it', async () => {
      const { queue, client, worker } = setup([
        { kind: 'not_reachable', reason: 'SERVER_ERROR' },
        { kind: 'not_reachable', reason: 'CONNECTION' },
        { kind: 'ok' },
        { kind: 'ok' },
      ]);
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await worker.start();
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId]);

      await vi.advanceTimersByTimeAsync(1 * MINUTE);
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([request(1).punchId, request(1).punchId]);

      await vi.advanceTimersByTimeAsync(2 * MINUTE);
      await flush();
      expect(client.calls.map((c) => c.punchId)).toEqual([
        request(1).punchId,
        request(1).punchId,
        request(1).punchId,
        request(2).punchId,
      ]);
      expect(await queue.waitingCount()).toBe(0);
    });

    it('the retry timer fires at nextDueAt, never earlier than 60 s after the last attempt', async () => {
      const { queue, client, worker } = setup([{ kind: 'not_reachable' }, { kind: 'ok' }]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();

      const dueAt = present(await queue.nextDueAt());
      expect(dueAt).toBe(START + 1 * MINUTE);
      await vi.advanceTimersByTimeAsync(dueAt - Date.now() - 1);
      expect(client.calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      await flush();
      expect(client.calls).toHaveLength(2);
      expect(client.callTimes[1]).toBe(dueAt);
    });

    it('an unexpected error is reported and treated as no answer', async () => {
      const { queue, client, worker, errors } = setup([
        { kind: 'throw', error: new Error('disk full') },
      ]);
      await queue.enqueue(request(1), 'IN');
      await worker.start();
      await flush();

      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe('disk full');
      const row = present(await queue.get(request(1).punchId));
      expect(row.attempts).toBe(1);
      expect(row.nextAttemptAt).toBe(START + 1 * MINUTE);
      expect(client.calls).toHaveLength(1);
    });
  });

  describe('state for the home screen (R6.4, R6.13, R6.16)', () => {
    it('subscribe gives the current state at once and every change afterwards', async () => {
      const { queue, worker } = setup([{ kind: 'hang' }]);
      const seen: QueueState[] = [];
      const unsubscribe = worker.subscribe((s) => seen.push(s));
      expect(seen).toEqual([{ waiting: 0, refused: [], newestDirection: null }]);

      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await worker.queueChanged(); // before start: publishes, requests nothing
      expect(seen.at(-1)).toMatchObject({ waiting: 2, newestDirection: 'OUT' });
      expect(worker.attempts).toBe(0);

      unsubscribe();
      await worker.start();
      await flush();
      expect(seen).toHaveLength(2);
    });

    it('the same state is not published twice', async () => {
      const { worker, states } = setup();
      await worker.start();
      await flush();
      await worker.queueChanged();
      await worker.queueChanged();
      expect(states).toEqual([]);
    });
  });
});

describe('historyEntryFor', () => {
  const row = {
    punchId: request(1).punchId,
    request: request(1),
    phoneTime: request(1).phoneTime,
    directionGuess: 'IN' as const,
    state: 'WAITING' as const,
    refusalMessage: null,
    attempts: 0,
    nextAttemptAt: 0,
    createdAt: START,
  };

  it('uses the server instant, local time, direction and flags; a duplicate is not counted', () => {
    expect(historyEntryFor(row, stored({ duplicate: true }))).toEqual({
      punchId: row.punchId,
      atMs: Date.parse('2025-04-03T03:42:00Z'),
      localDate: '2025-04-03',
      localTime: '09:12',
      direction: 'IN',
      flags: ['RECORDED_OFFLINE'],
      counted: false,
    });
  });

  it('works out the local time when the server omits it, and is null for an unreadable instant', () => {
    const entry = historyEntryFor(row, {
      ...stored(),
      atLocal: undefined as unknown as string,
      at: '2025-04-03T12:35:00Z',
    });
    expect(entry?.localTime).toBe('18:05');
    expect(historyEntryFor(row, stored({ at: 'yesterday' }))).toBeNull();
  });
});
