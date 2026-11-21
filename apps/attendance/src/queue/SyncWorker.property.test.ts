// Task 14.4 — Property 13 (Offline queue order, removal and label; R6.2–R6.5, R6.7, R6.13, R6.14,
// R6.16), Property 14 (Retry timing; R6.6, R6.15) and the pairing-end rule (R3.3), run against the
// real `PunchQueue` over `MemoryDatabase` and the real `SyncWorker` under fake timers, with a fake
// transport that holds every request open until the test answers it.
//
// Both properties are model based: a random sequence of operations (save a punch, answer the
// request in flight, tap OK, let time pass, fire a trigger) drives the worker, while a plain
// in-memory model of the queue is kept alongside and compared with the table, the published
// `QueueState` and the transport's log after every step.
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SERVER_MESSAGES } from '@inventory-platform/attendance-protocol';
import type {
  AppPunchRequest,
  AppPunchResponse,
  PunchDirection,
} from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { PUNCH_QUEUE_TABLE } from './db';
import { MemoryDatabase } from './memoryDb';
import { PUNCH_FIELD_NAMES, PunchQueue } from './PunchQueue';
import {
  MAX_TRIGGER_DELAY_MS,
  MIN_ATTEMPT_GAP_MS,
  SyncWorker,
  type QueueState,
  type SyncTimers,
  type Triggers,
} from './SyncWorker';

const NUM_RUNS = 100;
const MINUTE = 60_000;
const PAIRING = '66a1b2c3d4e5f60718293a4b';
const SHOP = '66a1b2c3d4e5f60718293a4c';
const EMPLOYEE = '66a1b2c3d4e5f60718293a4d';
// 2025-04-03 09:00 IST = 03:30 UTC
const START = Date.UTC(2025, 3, 3, 3, 30, 0);
const ALLOWED_PAYLOAD_KEYS = new Set<string>(PUNCH_FIELD_NAMES);
const EMPTY_STATE: QueueState = { waiting: 0, refused: [], newestDirection: null };

/**
 * R6.15 as the requirement states it, written out independently of the worker's own helper so a
 * wrong helper cannot vouch for itself: 1 minute after the first failed send, doubling each time,
 * capped at 15 minutes.
 */
function expectedWaitMs(failedSends: number): number {
  return Math.min(15 * MINUTE, MINUTE * 2 ** (failedSends - 1));
}

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/** A signed request; `n` makes the punch id unique and `minute` sets the phone time. */
function request(n: number, minute: number): AppPunchRequest {
  return {
    pairingId: PAIRING,
    shopId: SHOP,
    employeeId: EMPLOYEE,
    punchId: `0f6b2c1e-9c4a-4a5e-8f1d-${String(n).padStart(12, '0')}`,
    phoneTime: `2025-04-03T03:${String(minute).padStart(2, '0')}:00Z`,
    offline: true,
    locationChecked: true,
    distanceMetres: 12,
    accuracyMetres: 8,
    mock: false,
    signature: `sig-${n}`,
  };
}

function okResponse(outcome: 'STORED' | 'DUPLICATE' | 'REPLAYED'): AppPunchResponse {
  return {
    outcome,
    direction: 'IN',
    at: '2025-04-03T03:42:00Z',
    atLocal: '09:12',
    flags: ['RECORDED_OFFLINE'],
    duplicate: outcome === 'DUPLICATE',
    todayIn: '09:12',
    todayOut: null,
    nextDirection: 'OUT',
  };
}

type NotReachableReason = 'TIMEOUT' | 'CONNECTION' | 'SERVER_ERROR';

/** What the server may say to one request. */
type Answer =
  | { kind: 'stored' }
  | { kind: 'duplicate' }
  | { kind: 'replayed' }
  | { kind: 'refusal'; status: number; message: string }
  | { kind: 'no_answer'; reason: NotReachableReason }
  | { kind: 'not_paired'; status: number; message: string };

/** The text the app keeps for a refusal: `ServerRefusal.message`, word for word (R6.13). */
function refusalMessageFor(answer: { status: number; message: string }): string {
  return new ServerRefusal(answer.status, answer.message).message;
}

interface Call {
  punchId: string;
  /** Epoch ms when the request was made. */
  at: number;
  /** Epoch ms when the test answered it; null while it is still open. */
  answeredAt: number | null;
  /** `worker.attempts` at the moment of the call: which attempt sent it. */
  attempt: number;
}

/**
 * A fake `AppClient.postPunch`. Every request stays open until {@link release} answers it, so the
 * test chooses the server's answer and its timing. A second request while one is open is a
 * violation (R6.15), recorded rather than thrown so the worker's error path cannot hide it.
 */
class HeldTransport {
  readonly calls: Call[] = [];
  readonly violations: string[] = [];
  /** How many attempts the worker has started; set once the worker exists. */
  attemptOf: () => number = () => 0;
  /** Called with every request before it is held; the model checks go here. */
  onCall: ((request: AppPunchRequest) => void) | null = null;
  private pending: { call: Call; settle: (answer: Answer) => void } | null = null;

  /** The punch id of the request in flight, or null. */
  get inFlight(): string | null {
    return this.pending ? this.pending.call.punchId : null;
  }

  postPunch(request: AppPunchRequest): Promise<AppPunchResponse> {
    if (this.pending) {
      this.violations.push(
        `request for ${request.punchId} while ${this.pending.call.punchId} was still in flight`,
      );
    }
    const call: Call = {
      punchId: request.punchId,
      at: Date.now(),
      answeredAt: null,
      attempt: this.attemptOf(),
    };
    this.calls.push(call);
    this.onCall?.(request);
    return new Promise((resolve, reject) => {
      this.pending = {
        call,
        settle: (answer) => {
          this.pending = null;
          call.answeredAt = Date.now();
          settleWith(answer).then(resolve, reject);
        },
      };
    });
  }

  /** Answers the request in flight. Returns its punch id, or null when nothing was in flight. */
  release(answer: Answer): string | null {
    if (!this.pending) {
      return null;
    }
    const { call, settle } = this.pending;
    settle(answer);
    return call.punchId;
  }
}

async function settleWith(answer: Answer): Promise<AppPunchResponse> {
  switch (answer.kind) {
    case 'stored':
      return okResponse('STORED');
    case 'duplicate':
      return okResponse('DUPLICATE');
    case 'replayed':
      return okResponse('REPLAYED');
    case 'refusal':
    case 'not_paired':
      throw new ServerRefusal(answer.status, answer.message);
    case 'no_answer':
      throw new NotReachable(answer.reason);
  }
}

class FakeTriggers implements Triggers {
  private network: (() => void) | null = null;
  private foreground: (() => void) | null = null;
  private background: (() => Promise<void>) | null = null;

  onNetworkConnected(listener: () => void) {
    this.network = listener;
    return () => {
      this.network = null;
    };
  }

  onForeground(listener: () => void) {
    this.foreground = listener;
    return () => {
      this.foreground = null;
    };
  }

  onBackgroundRun(run: () => Promise<void>) {
    this.background = run;
    return () => {
      this.background = null;
    };
  }

  /** Fires a trigger; after `stop` the worker is unsubscribed and nothing happens. */
  fire(which: 'network' | 'foreground'): void {
    (which === 'network' ? this.network : this.foreground)?.();
  }

  /** Runs the background task as the OS would; resolves at once when unsubscribed. */
  runBackground(): Promise<void> {
    return this.background ? this.background() : Promise.resolve();
  }
}

/** The model of one queued punch: what the real row must say. */
interface ModelRow {
  punchId: string;
  phoneTime: string;
  createdAt: number;
  direction: PunchDirection;
  state: 'WAITING' | 'REFUSED';
  refusalMessage: string | null;
  attempts: number;
  nextAttemptAt: number;
}

/** The send order: oldest phone time first, then by save time (R6.5). */
function sendOrder(a: ModelRow, b: ModelRow): number {
  if (a.phoneTime !== b.phoneTime) {
    return a.phoneTime < b.phoneTime ? -1 : 1;
  }
  return a.createdAt - b.createdAt;
}

class QueueModel {
  readonly rows = new Map<string, ModelRow>();

  waiting(): ModelRow[] {
    return [...this.rows.values()].filter((r) => r.state === 'WAITING').sort(sendOrder);
  }

  refused(): ModelRow[] {
    return [...this.rows.values()].filter((r) => r.state === 'REFUSED').sort(sendOrder);
  }

  head(): ModelRow | null {
    return this.waiting()[0] ?? null;
  }

  /** The newest waiting punch's guess, for the home-screen label (R6.4). */
  newestDirection(): PunchDirection | null {
    const waiting = this.waiting();
    return waiting.length > 0 ? waiting[waiting.length - 1].direction : null;
  }

  /** Applies the server's answer to the punch that was in flight (R6.7, R6.13, R6.15). */
  answer(punchId: string, answer: Answer, now: number): void {
    const row = this.rows.get(punchId);
    if (!row) {
      throw new Error(`model has no row ${punchId}`);
    }
    switch (answer.kind) {
      case 'stored':
      case 'duplicate':
      case 'replayed':
        this.rows.delete(punchId);
        return;
      case 'refusal':
        row.state = 'REFUSED';
        row.refusalMessage = refusalMessageFor(answer);
        return;
      case 'no_answer':
        row.attempts += 1;
        row.nextAttemptAt = now + expectedWaitMs(row.attempts);
        return;
      case 'not_paired':
        return; // the row is left as is; the wipe deletes the whole store (R3.3)
    }
  }
}

/** Builds the queue, the worker, the transport and an attempt-start recorder for one run. */
function harness() {
  const db = new MemoryDatabase();
  const queue = new PunchQueue(db, { now: () => Date.now() });
  const triggers = new FakeTriggers();
  const transport = new HeldTransport();
  const states: QueueState[] = [];
  const wipes: number[] = [];
  const ended: unknown[] = [];
  const errors: unknown[] = [];
  /** Epoch ms of every attempt start, in order. */
  const attemptStarts: number[] = [];
  let attemptsSeen = 0;

  /** Records the attempt starts that have happened since the last look. */
  const noteAttempts = () => {
    while (attemptsSeen < worker.attempts) {
      attemptsSeen += 1;
      attemptStarts.push(Date.now());
    }
  };
  // The worker starts attempts inside its timer callbacks (and in `runNow`), synchronously, so
  // looking at `worker.attempts` right after each callback catches every start at its exact time.
  const timers: SyncTimers = {
    setTimeout: (callback, ms) =>
      setTimeout(() => {
        callback();
        noteAttempts();
      }, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };

  const worker = new SyncWorker({
    queue,
    client: transport,
    pairingStore: {
      wipe: async () => {
        wipes.push(Date.now());
      },
    },
    clock: () => Date.now(),
    timers,
    triggers,
    onChange: (state) => states.push(state),
    onPairingEnded: (e) => ended.push(e),
    onError: (e) => errors.push(e),
  });
  transport.attemptOf = () => worker.attempts;

  return {
    db,
    queue,
    worker,
    transport,
    triggers,
    states,
    wipes,
    ended,
    errors,
    attemptStarts,
    noteAttempts,
  };
}

type Harness = ReturnType<typeof harness>;

/** Lets the worker's promise chains settle without moving the clock. */
const flush = () => vi.advanceTimersByTimeAsync(0);

/** Every row in the table against the model, plus the no-coordinates rule (R9.2, R9.5). */
function expectRowsMatch(db: MemoryDatabase, model: QueueModel): void {
  const rows = db.dump(PUNCH_QUEUE_TABLE);
  const actual = rows
    .map((row) => ({
      punchId: String(row['punch_id']),
      state: row['state'],
      refusalMessage: row['refusal_message'],
      attempts: row['attempts'],
      nextAttemptAt: row['next_attempt_at'],
      direction: row['direction_guess'],
    }))
    .sort((a, b) => a.punchId.localeCompare(b.punchId));
  const expected = [...model.rows.values()]
    .map((r) => ({
      punchId: r.punchId,
      state: r.state,
      refusalMessage: r.refusalMessage,
      attempts: r.attempts,
      nextAttemptAt: r.nextAttemptAt,
      direction: r.direction,
    }))
    .sort((a, b) => a.punchId.localeCompare(b.punchId));
  expect(actual).toEqual(expected);
  for (const row of rows) {
    for (const key of Object.keys(JSON.parse(row['payload'] as string) as object)) {
      expect(ALLOWED_PAYLOAD_KEYS.has(key)).toBe(true);
      expect(key).not.toMatch(/lat|lng|lon|coord|position/i);
    }
  }
}

/** The published state and the queue's own answers against the model (R6.4, R6.13, R6.16). */
async function expectStateMatches(h: Harness, model: QueueModel): Promise<void> {
  const waiting = model.waiting().length;
  const newestDirection = model.newestDirection();
  const refused = model.refused().map((r) => [r.punchId, r.refusalMessage]);
  expect({
    waiting: h.worker.state.waiting,
    newestDirection: h.worker.state.newestDirection,
    refused: h.worker.state.refused.map((r) => [r.punchId, r.refusalMessage]),
  }).toEqual({ waiting, newestDirection, refused });
  expect(await h.queue.waitingCount()).toBe(waiting);
  expect(await h.queue.newestKnownDirection()).toBe(newestDirection);
  expectRowsMatch(h.db, model);
  expect(h.transport.violations).toEqual([]);
}

// ---------------------------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------------------------

const direction = fc.constantFrom<PunchDirection>('IN', 'OUT');

/** A refusal the server may give for a queued punch; never the not-paired one (that is R3.3). */
const refusalAnswer: fc.Arbitrary<Answer> = fc
  .record({
    status: fc.constantFrom(400, 409, 422, 429),
    message: fc.oneof(
      fc.constantFrom(
        SERVER_MESSAGES.HR_APP_OFF,
        SERVER_MESSAGES.HR_APP_TOO_LATE,
        SERVER_MESSAGES.HR_APP_CLOCK_WRONG,
        SERVER_MESSAGES.HR_FAKE_LOCATION,
        SERVER_MESSAGES.HR_APP_NOT_VERIFIED,
        'You are on approved leave today',
      ),
      fc.stringMatching(/^[A-Za-z][A-Za-z .,']{3,60}$/),
    ),
  })
  .filter((r) => r.message.trim() !== SERVER_MESSAGES.HR_APP_NOT_PAIRED)
  .map((r) => ({ kind: 'refusal' as const, ...r }));

const noAnswer: fc.Arbitrary<Answer> = fc
  .constantFrom<NotReachableReason>('TIMEOUT', 'CONNECTION', 'SERVER_ERROR')
  .map((reason) => ({ kind: 'no_answer' as const, reason }));

const okAnswer: fc.Arbitrary<Answer> = fc.constantFrom<Answer>(
  { kind: 'stored' },
  { kind: 'duplicate' },
  { kind: 'replayed' },
);

const anyAnswer: fc.Arbitrary<Answer> = fc.oneof(
  { weight: 3, arbitrary: okAnswer },
  { weight: 2, arbitrary: refusalAnswer },
  { weight: 2, arbitrary: noAnswer },
);

/** `HR_APP_NOT_PAIRED` as the client infers it: the known text, or any 403. */
const notPairedAnswer: fc.Arbitrary<Answer> = fc
  .constantFrom(
    { status: 403, message: SERVER_MESSAGES.HR_APP_NOT_PAIRED },
    { status: 403, message: 'Pairing revoked' },
    { status: 409, message: SERVER_MESSAGES.HR_APP_NOT_PAIRED },
  )
  .map((r) => ({ kind: 'not_paired' as const, ...r }));

/** Time to let pass: a few seconds, a few minutes, or past the longest retry wait. */
const advanceMs = fc.oneof(
  fc.integer({ min: 0, max: 5_000 }),
  fc.integer({ min: 0, max: 3 * MINUTE }),
  fc.integer({ min: 0, max: 16 * MINUTE }),
);

type QueueOp =
  | { kind: 'enqueue'; minute: number; direction: PunchDirection }
  | { kind: 'answer'; answer: Answer }
  | { kind: 'dismiss'; index: number }
  | { kind: 'advance'; ms: number }
  | { kind: 'trigger'; which: 'network' | 'foreground' };

const queueOp: fc.Arbitrary<QueueOp> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant('enqueue' as const),
      minute: fc.integer({ min: 0, max: 59 }),
      direction,
    }),
  },
  { weight: 6, arbitrary: fc.record({ kind: fc.constant('answer' as const), answer: anyAnswer }) },
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant('dismiss' as const), index: fc.nat({ max: 7 }) }),
  },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant('advance' as const), ms: advanceMs }) },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('trigger' as const),
      which: fc.constantFrom<'network' | 'foreground'>('network', 'foreground'),
    }),
  },
);

function useFakeClock(): void {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
}

/** A clean clock for one property run. */
function resetClock(): void {
  vi.clearAllTimers();
  vi.setSystemTime(START);
}

// ---------------------------------------------------------------------------------------------
// Property 13
// ---------------------------------------------------------------------------------------------

describe('Feature: HR-module, Property 13: Offline queue order, removal and label', () => {
  useFakeClock();

  it('for any sequence of saves, answers, OKs, waits and triggers: only the oldest due waiting punch is sent, one at a time; rows leave exactly on an answer or OK; refusals are never resent; the published state always equals the queue (R6.2–R6.5, R6.7, R6.13, R6.14, R6.16)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(queueOp, { minLength: 1, maxLength: 30 }), async (ops) => {
        resetClock();
        const h = harness();
        const model = new QueueModel();
        let nextPunch = 1;

        // Every request must be for the model's head, due, and WAITING (R6.5, R6.13, R6.15).
        h.transport.onCall = (req) => {
          const head = model.head();
          const row = model.rows.get(req.punchId);
          if (!head) {
            h.transport.violations.push(`sent ${req.punchId} while nothing was waiting`);
          } else if (head.punchId !== req.punchId) {
            h.transport.violations.push(`sent ${req.punchId}; oldest waiting is ${head.punchId}`);
          } else if (head.nextAttemptAt > Date.now()) {
            h.transport.violations.push(`sent ${req.punchId} before its retry was due`);
          }
          if (row?.state === 'REFUSED') {
            h.transport.violations.push(`resent refused punch ${req.punchId}`);
          }
        };

        await h.worker.start();
        await flush();
        await expectStateMatches(h, model);

        for (const op of ops) {
          switch (op.kind) {
            case 'enqueue': {
              // One millisecond apart so rows with the same phone time have distinct save times.
              await vi.advanceTimersByTimeAsync(1);
              const req = request(nextPunch, op.minute);
              nextPunch += 1;
              await h.queue.enqueue(req, op.direction);
              model.rows.set(req.punchId, {
                punchId: req.punchId,
                phoneTime: req.phoneTime,
                createdAt: Date.now(),
                direction: op.direction,
                state: 'WAITING',
                refusalMessage: null,
                attempts: 0,
                nextAttemptAt: 0,
              });
              await h.worker.queueChanged();
              // R6.16, R6.4: published in the same tick as the save, before any timer runs.
              expect(h.worker.state.waiting).toBe(model.waiting().length);
              expect(h.worker.state.newestDirection).toBe(model.newestDirection());
              break;
            }
            case 'answer': {
              const punchId = h.transport.release(op.answer);
              if (punchId !== null) {
                model.answer(punchId, op.answer, Date.now());
              }
              await flush();
              break;
            }
            case 'dismiss': {
              const refused = model.refused();
              if (refused.length > 0) {
                const target = refused[op.index % refused.length];
                expect(await h.worker.dismissRefused(target.punchId)).toBe(true);
                model.rows.delete(target.punchId);
                // R6.14: gone as soon as OK is tapped, and the state follows at once.
                expect(h.worker.state.refused.map((r) => r.punchId)).not.toContain(target.punchId);
              } else {
                expect(await h.worker.dismissRefused('nothing-refused')).toBe(false);
              }
              break;
            }
            case 'advance':
              await vi.advanceTimersByTimeAsync(op.ms);
              break;
            case 'trigger':
              h.triggers.fire(op.which);
              await flush();
              break;
          }
          await expectStateMatches(h, model);
        }

        expect(h.errors).toEqual([]);
        h.transport.release({ kind: 'no_answer', reason: 'TIMEOUT' });
        await flush();
        h.worker.stop();
      }),
      { numRuns: NUM_RUNS },
    );
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------
// Property 14
// ---------------------------------------------------------------------------------------------

type TimingTrigger = 'network' | 'foreground' | 'background' | 'queue';

type TimingOp =
  | { kind: 'advance'; ms: number }
  | { kind: 'trigger'; which: TimingTrigger }
  | { kind: 'refuse' };

const timingOp: fc.Arbitrary<TimingOp> = fc.oneof(
  { weight: 5, arbitrary: fc.record({ kind: fc.constant('advance' as const), ms: advanceMs }) },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant('trigger' as const),
      which: fc.constantFrom<TimingTrigger>('network', 'foreground', 'background', 'queue'),
    }),
  },
  { weight: 1, arbitrary: fc.constant({ kind: 'refuse' as const }) },
);

describe('Feature: HR-module, Property 14: Retry timing', () => {
  useFakeClock();

  it('for any sequence of lost answers, triggers and waits: a punch is retried after min(15 min, 1 min × 2^(attempts−1)) at nextDueAt, no two attempts start within 60 s, a trigger outside the floor starts an attempt within 5 s, and a refusal is never retried (R6.6, R6.15)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.array(timingOp, { minLength: 1, maxLength: 30 }),
        async (initialRows, ops) => {
          resetClock();
          const h = harness();
          let nextPunch = 1;
          /** Punches the server has refused; they must never be sent again. */
          const refused = new Set<string>();
          /** The next held request gets a refusal instead of being lost. */
          let refuseNext = false;

          // Punches are made in order, so each new one is placed after those waiting (R6.5) and
          // the head of the queue stays the head until it is answered.
          const enqueue = async () => {
            const req = request(nextPunch, nextPunch);
            nextPunch += 1;
            await h.queue.enqueue(req, 'IN');
          };
          for (let i = 0; i < initialRows; i++) {
            await enqueue();
          }

          /** Answers whatever is in flight and lets the worker settle. */
          const settle = async () => {
            for (;;) {
              const inFlight = h.transport.inFlight;
              if (inFlight === null) {
                return;
              }
              if (refuseNext) {
                refuseNext = false;
                refused.add(inFlight);
                h.transport.release({
                  kind: 'refusal',
                  status: 409,
                  message: 'Fake location detected',
                });
                await flush();
                continue; // a refusal is an answer: the worker goes on to the next row
              }
              const before = (await h.queue.get(inFlight))?.attempts ?? 0;
              const at = Date.now();
              h.transport.release({ kind: 'no_answer', reason: 'TIMEOUT' });
              await flush();
              // R6.15: the row waits min(15 min, 1 min × 2^(attempts − 1)); R6.6: the retry timer
              // is aimed at that moment, which the queue reports as nextDueAt.
              const row = await h.queue.get(inFlight);
              expect(row?.state).toBe('WAITING');
              expect(row?.attempts).toBe(before + 1);
              expect(row?.nextAttemptAt).toBe(at + expectedWaitMs(before + 1));
              expect(await h.queue.nextDueAt()).toBe(row?.nextAttemptAt);
              return; // a lost answer ends the attempt
            }
          };

          await h.worker.start();
          await flush();
          await settle();

          for (const op of ops) {
            switch (op.kind) {
              case 'advance':
                await vi.advanceTimersByTimeAsync(op.ms);
                await settle();
                break;
              case 'refuse':
                refuseNext = true;
                break;
              case 'trigger': {
                const now = Date.now();
                const lastStart = h.attemptStarts[h.attemptStarts.length - 1];
                const floorOpen = now >= lastStart + MIN_ATTEMPT_GAP_MS;
                const attemptsBefore = h.worker.attempts;
                expect(h.worker.isAttempting).toBe(false);
                if (op.which === 'queue') {
                  await enqueue();
                  await h.worker.queueChanged();
                } else if (op.which === 'background') {
                  const run = h.triggers.runBackground();
                  h.noteAttempts();
                  await flush();
                  await settle();
                  await run;
                } else {
                  h.triggers.fire(op.which);
                }
                await vi.advanceTimersByTimeAsync(MAX_TRIGGER_DELAY_MS);
                if (floorOpen) {
                  // R6.6: an attempt starts within 5 s of the trigger (here: at once).
                  expect(h.worker.attempts).toBe(attemptsBefore + 1);
                  expect(h.attemptStarts[attemptsBefore]).toBe(now);
                } else {
                  // R6.6, R6.15: inside the floor nothing starts; the folded attempt waits for
                  // the floor's end (and the 60 s check below covers it).
                  const startedInside = h.attemptStarts
                    .slice(attemptsBefore)
                    .filter((t) => t < lastStart + MIN_ATTEMPT_GAP_MS);
                  expect(startedInside).toEqual([]);
                }
                await settle();
                break;
              }
            }
            expect(h.transport.violations).toEqual([]);
          }

          // R6.6, R6.15: never two attempts within 60 s. Every request belongs to a recorded
          // attempt: the first of an attempt goes out at its start, later ones (after a refusal)
          // only once the previous answer has come, never before the start.
          for (let i = 1; i < h.attemptStarts.length; i++) {
            expect(h.attemptStarts[i] - h.attemptStarts[i - 1]).toBeGreaterThanOrEqual(
              MIN_ATTEMPT_GAP_MS,
            );
          }
          const firstCallOfAttempt = new Set<number>();
          for (const call of h.transport.calls) {
            const started = h.attemptStarts[call.attempt - 1];
            expect(started).toBeDefined();
            if (!firstCallOfAttempt.has(call.attempt)) {
              firstCallOfAttempt.add(call.attempt);
              expect(call.at).toBe(started);
            } else {
              expect(call.at).toBeGreaterThanOrEqual(started);
            }
          }

          // R6.15: consecutive sends of one punch are spaced by its back-off, and the retry comes
          // at the first moment that is both due and 60 s past the attempt before it.
          const byPunch = new Map<string, Call[]>();
          for (const call of h.transport.calls) {
            byPunch.set(call.punchId, [...(byPunch.get(call.punchId) ?? []), call]);
          }
          for (const [punchId, calls] of byPunch) {
            for (let k = 1; k < calls.length; k++) {
              const answeredAt = calls[k - 1].answeredAt;
              expect(answeredAt).not.toBeNull();
              const dueAt = (answeredAt ?? 0) + expectedWaitMs(k);
              const lastAttemptBefore = Math.max(...h.attemptStarts.filter((t) => t < calls[k].at));
              expect(calls[k].at - calls[k - 1].at).toBeGreaterThanOrEqual(expectedWaitMs(k));
              expect(calls[k].at).toBe(Math.max(dueAt, lastAttemptBefore + MIN_ATTEMPT_GAP_MS));
            }
            if (refused.has(punchId)) {
              // The refusal answered the last call for this punch; it stays REFUSED (R6.13, R6.15).
              const last = calls[calls.length - 1];
              expect(
                h.transport.calls.filter((c) => c.punchId === punchId && c.at > last.at),
              ).toEqual([]);
              expect((await h.queue.get(punchId))?.state).toBe('REFUSED');
            }
          }
          expect(h.errors).toEqual([]);
          h.worker.stop();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------
// Pairing end (R3.3)
// ---------------------------------------------------------------------------------------------

describe('Feature: HR-module, Property 13: Offline queue order, removal and label — pairing end (R3.3)', () => {
  useFakeClock();

  it('for any queue and any history of answers, the first HR_APP_NOT_PAIRED answer wipes the phone exactly once and stops the worker, and nothing is sent afterwards whatever happens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }),
        fc.array(anyAnswer, { maxLength: 6 }),
        notPairedAnswer,
        fc.array(queueOp, { maxLength: 10 }),
        async (initialRows, history, notPaired, afterOps) => {
          resetClock();
          const h = harness();
          let nextPunch = 1;
          const enqueue = async () => {
            const req = request(nextPunch, nextPunch);
            nextPunch += 1;
            await h.queue.enqueue(req, 'IN');
            await h.worker.queueChanged();
          };
          /** Makes sure a request is in flight: a new punch if needed, then past every wait. */
          const ensureInFlight = async () => {
            if (h.transport.inFlight === null) {
              await enqueue();
              await vi.advanceTimersByTimeAsync(16 * MINUTE);
            }
            if (h.transport.inFlight === null) {
              await vi.advanceTimersByTimeAsync(16 * MINUTE);
            }
            expect(h.transport.inFlight).not.toBeNull();
          };

          for (let i = 0; i < initialRows; i++) {
            await enqueue();
          }
          await h.worker.start();
          await flush();

          // Some ordinary history first.
          for (const answer of history) {
            await ensureInFlight();
            h.transport.release(answer);
            await flush();
          }
          await ensureInFlight();
          const callsBefore = h.transport.calls.length;

          h.transport.release(notPaired);
          await flush();

          expect(h.wipes).toHaveLength(1);
          expect(h.ended).toHaveLength(1);
          expect(h.ended[0]).toMatchObject({ reason: 'NOT_PAIRED' });
          expect(h.worker.isRunning).toBe(false);
          expect(h.worker.isAttempting).toBe(false);
          expect(h.worker.state).toEqual(EMPTY_STATE);
          expect(h.transport.calls).toHaveLength(callsBefore);

          // Whatever happens next (more saves, triggers, time, a restart), nothing is sent and
          // the wipe is not repeated.
          for (const op of afterOps) {
            switch (op.kind) {
              case 'enqueue':
                await enqueue();
                break;
              case 'answer':
                expect(h.transport.release(op.answer)).toBeNull();
                break;
              case 'dismiss':
                expect(await h.worker.dismissRefused('anything')).toBe(false);
                break;
              case 'advance':
                await vi.advanceTimersByTimeAsync(op.ms);
                break;
              case 'trigger':
                h.triggers.fire(op.which);
                await flush();
                break;
            }
          }
          await h.worker.start();
          await h.triggers.runBackground();
          await vi.advanceTimersByTimeAsync(30 * MINUTE);

          expect(h.transport.calls).toHaveLength(callsBefore);
          expect(h.wipes).toHaveLength(1);
          expect(h.ended).toHaveLength(1);
          expect(h.worker.isRunning).toBe(false);
          expect(h.worker.state).toEqual(EMPTY_STATE);
          expect(h.transport.violations).toEqual([]);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 120_000);
});
