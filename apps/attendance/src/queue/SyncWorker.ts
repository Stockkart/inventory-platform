/**
 * Sends the offline queue to the server (design "Attendance app" table, `SyncWorker`; R6.5–R6.7,
 * R6.15; R3.3). One worker per app process, built in `src/app/deps.ts`.
 *
 * Words used below, and what they mean here:
 *
 * - A **trigger** is a reason to try sending: network back (NetInfo "connected"), the app opened or
 *   brought to the foreground (`AppState`), a retry falling due (the worker's own timer), the
 *   OS background task (`expo-background-task`, ≥ 15 min, best effort), {@link start}, and
 *   {@link queueChanged} (a punch was just saved). The Expo bindings live in `./expoTriggers.ts`
 *   behind the {@link Triggers} interface, so this file has no Expo or React Native import.
 * - An **attempt** is one pass over the queue, started by a trigger. It starts at once when allowed
 *   (so "within 5 seconds", R6.6) but never within {@link MIN_ATTEMPT_GAP_MS} = 60 s of the start of
 *   the previous attempt (R6.6, R6.15); a trigger inside that gap is folded into one attempt at the
 *   end of it. Triggers that arrive while an attempt runs are folded into one follow-up attempt.
 * - Inside an attempt, rows go **oldest first by phone time, one request at a time**: the next row
 *   is sent only after the server has answered the previous one (R6.5). There is never more than
 *   one request in flight (R6.15).
 *
 * What one answer does to the row (R6.7, R6.13–R6.15, R3.3):
 *
 * | Server's answer                                   | Row                                                    | Then        |
 * | ------------------------------------------------- | ------------------------------------------------------ | ----------- |
 * | stored / duplicate / replayed (200)               | deleted (`markAnswered`), recorded in the history cache | next row    |
 * | refusal with a reason (4xx)                       | `REFUSED` with the message, never sent again           | next row    |
 * | `HR_APP_NOT_PAIRED`                               | left as is; `pairingStore.wipe()` deletes everything   | worker stops |
 * | no answer (10 s timeout, connection error, 5xx)   | `attempts + 1`, retry after `min(15 min, 1 min × 2^(attempts − 1))` | attempt ends |
 *
 * Because the head of the queue waits out its back-off before anything behind it is sent, the
 * back-off also keeps the oldest-first order (R6.5). A retry timer is set for the moment the head
 * is due, never earlier than 60 s after the attempt that scheduled it.
 *
 * The worker publishes a {@link QueueState} (waiting count, refused rows, the newest queued
 * direction) to {@link subscribe} listeners and to `onChange` whenever the queue changes, so the
 * home screen can show "N punches waiting to be sent" within 1 s (R6.16), the label while rows
 * wait (R6.4) and the refusal cards (R6.13).
 *
 * Pure apart from its injected dependencies: tests pass a `PunchQueue` over `MemoryDatabase`, a
 * fake client, a fake clock, fake timers and hand-fired triggers.
 */
import type {
  AppPunchRequest,
  AppPunchResponse,
  PunchDirection,
} from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import { endPairingIf, type PairingEnded, type Wiper } from '../app/pairingEnded';
import type { HistoryEntry } from '../history/HistoryCache';
import { kolkataDate, kolkataTime, parseInstant } from '../history/kolkataDates';
import type { PunchQueue, QueuedPunch } from './PunchQueue';

/** R6.6, R6.15: two attempts never start less than this far apart. */
export const MIN_ATTEMPT_GAP_MS = 60_000;

/** R6.6: an attempt starts within this long of a trigger (the worker starts it at once). */
export const MAX_TRIGGER_DELAY_MS = 5_000;

/** R6.15: the wait after the first failed send of a punch. */
export const FIRST_RETRY_WAIT_MS = 60_000;

/** R6.15: the longest wait between retries of one punch. */
export const MAX_RETRY_WAIT_MS = 15 * 60_000;

/**
 * R6.15: the wait before retrying a punch that has failed `attempts` times (`attempts ≥ 1`):
 * 1, 2, 4, 8 minutes, then 15 minutes for every later failure.
 */
export function retryWaitMs(attempts: number): number {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error('attempts must be a positive integer');
  }
  // 2^(attempts − 1) overflows to Infinity for large counts; Math.min keeps it at the cap.
  return Math.min(MAX_RETRY_WAIT_MS, FIRST_RETRY_WAIT_MS * 2 ** (attempts - 1));
}

/** Why an attempt was requested; for logging and tests. */
export type SyncTrigger = 'start' | 'network' | 'foreground' | 'retry' | 'background' | 'queue';

export type Unsubscribe = () => void;

/**
 * The OS events that may start an attempt. `./expoTriggers.ts` binds them to NetInfo, `AppState`
 * and `expo-background-task`; tests fire them by hand.
 */
export interface Triggers {
  /** Fires when the phone reports that network is back (not on every state change). */
  onNetworkConnected(listener: () => void): Unsubscribe;
  /** Fires when the app comes to the foreground. */
  onForeground(listener: () => void): Unsubscribe;
  /**
   * Registers the function the OS background task runs (≥ 15 min apart, best effort). The
   * returned promise resolves when the attempt has finished, so the OS waits for it.
   */
  onBackgroundRun(run: () => Promise<void>): Unsubscribe;
}

/** `setTimeout` / `clearTimeout` as the worker uses them; the globals by default. */
export interface SyncTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** What the home screen needs from the queue, published on every change. */
export interface QueueState {
  /** "N punches waiting to be sent" (R6.16); refused rows do not count. */
  waiting: number;
  /** Refused punches, oldest first, shown until the worker taps OK (R6.13). */
  refused: QueuedPunch[];
  /** The newest waiting punch's guessed direction, for the label while rows wait (R6.4). */
  newestDirection: PunchDirection | null;
}

/** The part of `PunchQueue` the worker uses. */
export type SyncQueue = Pick<
  PunchQueue,
  | 'nextWaiting'
  | 'nextDueAt'
  | 'markAnswered'
  | 'markRefused'
  | 'dismissRefused'
  | 'scheduleRetry'
  | 'waitingCount'
  | 'newestKnownDirection'
  | 'refused'
>;

/** The part of `AppClient` the worker uses. */
export interface SyncClient {
  postPunch(request: AppPunchRequest): Promise<AppPunchResponse>;
}

/** Where answered punches are recorded for the history screen (`HistoryCache.upsert`). */
export interface HistoryRecorder {
  upsert(entry: HistoryEntry): Promise<void>;
}

export interface SyncWorkerDeps {
  queue: SyncQueue;
  client: SyncClient;
  /** `PairingStore`: `wipe()` runs on `HR_APP_NOT_PAIRED` (R3.3, R9.6). */
  pairingStore: Wiper;
  /** Phone clock in epoch ms; `Date.now` on the phone, a fake in tests. */
  clock?: () => number;
  timers?: SyncTimers;
  /** OS triggers; none means only {@link start}, {@link queueChanged} and the retry timer. */
  triggers?: Triggers;
  /** When given, every stored, duplicate or replayed punch is written here as it leaves the queue. */
  history?: HistoryRecorder;
  /** Called with the new state whenever the queue changes (same as {@link subscribe}). */
  onChange?: (state: QueueState) => void;
  /** Called once when the server says the phone is no longer paired and the wipe has run. */
  onPairingEnded?: (ended: PairingEnded & { wipeError?: unknown }) => void;
  /** Errors the worker handled by backing off (unexpected ones, not refusals or "not reachable"). */
  onError?: (error: unknown) => void;
}

const EMPTY_STATE: QueueState = { waiting: 0, refused: [], newestDirection: null };

export class SyncWorker {
  private readonly queue: SyncQueue;
  private readonly client: SyncClient;
  private readonly pairingStore: Wiper;
  private readonly clock: () => number;
  private readonly timers: SyncTimers;
  private readonly triggers: Triggers | undefined;
  private readonly history: HistoryRecorder | undefined;
  private readonly onChange: ((state: QueueState) => void) | undefined;
  private readonly onPairingEnded: SyncWorkerDeps['onPairingEnded'];
  private readonly onError: ((error: unknown) => void) | undefined;

  private readonly listeners = new Set<(state: QueueState) => void>();
  private current: QueueState = EMPTY_STATE;

  private running = false;
  private ended = false;
  private unsubscribers: Unsubscribe[] = [];

  /** The attempt in progress, or null. */
  private attempt: Promise<void> | null = null;
  /** Epoch ms when the last attempt started; null before the first. */
  private lastAttemptAt: number | null = null;
  /** A trigger arrived during an attempt: run once more when it ends. */
  private followUp = false;
  private timer: unknown = null;
  private timerAt: number | null = null;
  private attemptCount = 0;
  private lastTrigger: SyncTrigger | null = null;

  constructor(deps: SyncWorkerDeps) {
    this.queue = deps.queue;
    this.client = deps.client;
    this.pairingStore = deps.pairingStore;
    this.clock = deps.clock ?? Date.now;
    this.timers = deps.timers ?? globalTimers;
    this.triggers = deps.triggers;
    this.history = deps.history;
    this.onChange = deps.onChange;
    this.onPairingEnded = deps.onPairingEnded;
    this.onError = deps.onError;
  }

  // ---- lifecycle ----

  /**
   * Subscribes to the triggers, publishes the current queue state and requests a first attempt
   * (the app was just opened, R6.6). Calling it twice does nothing the second time.
   */
  async start(): Promise<void> {
    if (this.running || this.ended) {
      return;
    }
    this.running = true;
    if (this.triggers) {
      this.unsubscribers = [
        this.triggers.onNetworkConnected(() => this.requestAttempt('network')),
        this.triggers.onForeground(() => this.requestAttempt('foreground')),
        this.triggers.onBackgroundRun(() => this.runNow('background')),
      ];
    }
    await this.refresh();
    this.requestAttempt('start');
  }

  /** Unsubscribes from the triggers and cancels the retry timer. An attempt in flight finishes. */
  stop(): void {
    this.running = false;
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.clearTimer();
  }

  /** True between {@link start} and {@link stop}. */
  get isRunning(): boolean {
    return this.running;
  }

  /** True while a request is in flight or rows are being worked through. */
  get isAttempting(): boolean {
    return this.attempt !== null;
  }

  /** Number of attempts started so far; for tests. */
  get attempts(): number {
    return this.attemptCount;
  }

  /** What started the last attempt; for logging and tests. */
  get lastAttemptTrigger(): SyncTrigger | null {
    return this.lastTrigger;
  }

  // ---- queue state for the UI ----

  /** The last published state. */
  get state(): QueueState {
    return this.current;
  }

  /** Listens for state changes; the listener is called at once with the current state. */
  subscribe(listener: (state: QueueState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * The offline path saved a punch (task 14.3): the state is re-read and published, and an
   * attempt is requested (subject to the 60 s floor).
   */
  async queueChanged(): Promise<void> {
    await this.refresh();
    this.requestAttempt('queue');
  }

  /** The worker tapped OK on a refusal card (R6.14): the refused row is deleted. */
  async dismissRefused(punchId: string): Promise<boolean> {
    const deleted = await this.queue.dismissRefused(punchId);
    await this.refresh();
    return deleted;
  }

  // ---- attempts ----

  /**
   * Asks for an attempt. Starts one at once when none is running and the 60 s floor has passed;
   * otherwise one attempt is scheduled for the end of the floor, or for after the running one.
   */
  requestAttempt(trigger: SyncTrigger): void {
    if (!this.running || this.ended) {
      return;
    }
    if (this.attempt) {
      this.followUp = true;
      return;
    }
    this.scheduleAt(this.earliestStart(), trigger);
  }

  /**
   * Runs an attempt now when allowed and resolves when it has finished; otherwise resolves with
   * the attempt in flight, or at once when the 60 s floor forbids one (the retry timer covers it
   * while the app runs; the background task tries again on its next slot).
   */
  runNow(trigger: SyncTrigger): Promise<void> {
    if (this.ended) {
      return Promise.resolve();
    }
    if (this.attempt) {
      return this.attempt;
    }
    if (this.earliestStart() > this.clock()) {
      return Promise.resolve();
    }
    return this.beginAttempt(trigger);
  }

  private earliestStart(): number {
    const now = this.clock();
    return this.lastAttemptAt === null
      ? now
      : Math.max(now, this.lastAttemptAt + MIN_ATTEMPT_GAP_MS);
  }

  private scheduleAt(at: number, trigger: SyncTrigger): void {
    if (this.timer !== null && this.timerAt !== null && this.timerAt <= at) {
      return; // an earlier (or equal) attempt is already scheduled
    }
    this.clearTimer();
    const delay = Math.max(0, at - this.clock());
    this.timerAt = at;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      this.timerAt = null;
      if (!this.running) {
        return;
      }
      if (this.attempt) {
        this.followUp = true;
        return;
      }
      void this.beginAttempt(trigger);
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
    }
    this.timer = null;
    this.timerAt = null;
  }

  private beginAttempt(trigger: SyncTrigger): Promise<void> {
    this.lastAttemptAt = this.clock();
    this.lastTrigger = trigger;
    this.attemptCount += 1;
    this.followUp = false;
    this.clearTimer();
    const run = this.drain()
      .catch((error: unknown) => this.onError?.(error))
      .then(() => this.afterAttempt());
    this.attempt = run;
    return run;
  }

  private async afterAttempt(): Promise<void> {
    this.attempt = null;
    if (!this.running || this.ended) {
      return;
    }
    const floor = (this.lastAttemptAt ?? this.clock()) + MIN_ATTEMPT_GAP_MS;
    if (this.followUp) {
      this.followUp = false;
      this.scheduleAt(Math.max(this.clock(), floor), 'queue');
      return;
    }
    const dueAt = await this.queue.nextDueAt();
    if (dueAt !== null) {
      this.scheduleAt(Math.max(dueAt, floor, this.clock()), 'retry');
    }
  }

  /** One attempt: oldest due row first, one request at a time, until nothing is due (R6.5). */
  private async drain(): Promise<void> {
    for (;;) {
      if (this.ended) {
        return;
      }
      const row = await this.queue.nextWaiting(this.clock());
      if (!row) {
        await this.refresh();
        return;
      }
      const next = await this.sendOne(row);
      await this.refresh();
      if (next === 'stop') {
        return;
      }
    }
  }

  /** Sends one row and applies the answer to it. `continue` = look at the next row. */
  private async sendOne(row: QueuedPunch): Promise<'continue' | 'stop'> {
    let response: AppPunchResponse;
    try {
      response = await this.client.postPunch(row.request);
    } catch (error) {
      return this.handleFailure(row, error);
    }
    const record = this.history ? () => this.recordHistory(row, response) : undefined;
    await this.queue.markAnswered(row.punchId, record);
    return 'continue';
  }

  private async handleFailure(row: QueuedPunch, error: unknown): Promise<'continue' | 'stop'> {
    if (isNotReachable(error)) {
      await this.backOff(row);
      return 'stop';
    }
    if (isServerRefusal(error) && !error.notPaired) {
      // A refusal is an answer, not a failure (R6.13, R6.15): the row stays, refused, until OK.
      await this.queue.markRefused(row.punchId, error.message);
      return 'continue';
    }
    const ended = await endPairingIf(error, this.pairingStore);
    if (ended) {
      // R3.2–R3.3: the pairing is over; everything local is gone, nothing more is sent.
      this.ended = true;
      this.stop();
      this.current = EMPTY_STATE;
      this.publish();
      this.onPairingEnded?.(ended);
      return 'stop';
    }
    // Anything else (a signer or storage error): report it and back off like "no answer".
    this.onError?.(error);
    await this.backOff(row);
    return 'stop';
  }

  private async backOff(row: QueuedPunch): Promise<void> {
    const attempts = row.attempts + 1;
    await this.queue.scheduleRetry(row.punchId, this.clock() + retryWaitMs(attempts), attempts);
  }

  /**
   * The history-cache entry for an answered queued punch (R4.10): the server's instant and local
   * time, its direction and flags, `counted` = not a duplicate. Runs inside the queue's delete
   * transaction (R9.5); a cache failure is swallowed so the display cache never keeps a punch
   * queued that the server has stored.
   */
  private async recordHistory(row: QueuedPunch, response: AppPunchResponse): Promise<void> {
    const entry = historyEntryFor(row, response);
    if (!entry || !this.history) {
      return;
    }
    try {
      await this.history.upsert(entry);
    } catch (error) {
      this.onError?.(error);
    }
  }

  // ---- state ----

  private async refresh(): Promise<void> {
    if (this.ended) {
      return;
    }
    const [waiting, refused, newestDirection] = await Promise.all([
      this.queue.waitingCount(),
      this.queue.refused(),
      this.queue.newestKnownDirection(),
    ]);
    const next: QueueState = { waiting, refused, newestDirection };
    if (sameState(this.current, next)) {
      return;
    }
    this.current = next;
    this.publish();
  }

  private publish(): void {
    this.onChange?.(this.current);
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}

/**
 * Maps an answered queued punch to a history entry. Null when the server's `at` is unreadable, so
 * one odd answer never blocks the queue.
 */
export function historyEntryFor(row: QueuedPunch, response: AppPunchResponse): HistoryEntry | null {
  const atMs = parseInstant(response.at);
  if (atMs === null) {
    return null;
  }
  return {
    punchId: row.punchId,
    atMs,
    localDate: kolkataDate(atMs),
    localTime: typeof response.atLocal === 'string' ? response.atLocal : kolkataTime(atMs),
    direction: response.direction === 'OUT' ? 'OUT' : 'IN',
    flags: Array.isArray(response.flags) ? response.flags.filter(isText) : [],
    counted: response.duplicate !== true,
  };
}

function sameState(a: QueueState, b: QueueState): boolean {
  if (a.waiting !== b.waiting || a.newestDirection !== b.newestDirection) {
    return false;
  }
  if (a.refused.length !== b.refused.length) {
    return false;
  }
  return a.refused.every(
    (row, i) =>
      row.punchId === b.refused[i].punchId && row.refusalMessage === b.refused[i].refusalMessage,
  );
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

/** The runtime's timers, looked up at call time so test fakes installed later are honoured. */
const globalTimers: SyncTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
