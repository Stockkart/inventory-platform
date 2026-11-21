/**
 * The offline punch queue (design "Attendance app" table, `PunchQueue`): punches signed while the
 * server was not reachable, kept on the phone until the server has answered each one (R6.2–R6.16).
 *
 * Rules the queue enforces, with the requirement each comes from:
 *
 * - A row holds the ten signed `AppPunchFields` and the signature, nothing else: distance and
 *   accuracy already worked out at the tap, never coordinates (R9.2, R9.5). {@link enqueue} copies
 *   exactly those fields, so an extra property on the input (a `latitude`, a `coords` object) is
 *   never written, and its type refuses coordinate-named properties outright.
 * - Rows are sent oldest first by the phone's time, one at a time (R6.5): {@link nextWaiting}
 *   returns the head of the `WAITING` rows, and only when its `next_attempt_at` has passed; while
 *   the head waits for its retry nothing else is sent, so the order holds.
 * - A row leaves the queue only on an answer (R6.7): {@link markAnswered} deletes it in one
 *   transaction with whatever the caller records about the answer (R9.5); a refusal turns it
 *   `REFUSED` ({@link markRefused}), where it stays, excluded from the waiting count and from
 *   sending (R6.13), until the worker taps OK ({@link dismissRefused}, R6.14).
 * - The home-screen label while rows wait comes from the newest waiting row's guessed direction
 *   ({@link newestKnownDirection}, R6.4); the server still decides the real direction (R4.9).
 * - {@link waitingCount} is the number for "N punches waiting to be sent" (R6.16).
 *
 * Retry timing itself (back-off, the 60 s floor) belongs to `SyncWorker` (task 14.2); the queue
 * only stores what it decides through {@link scheduleRetry}.
 *
 * Pure apart from the injected {@link SqlDatabase}: the phone passes `expo-sqlite` through
 * `./expoDb.ts`, tests pass `MemoryDatabase`.
 */
import type {
  AppPunchFields,
  AppPunchRequest,
  PunchDirection,
} from '@inventory-platform/attendance-protocol';

import {
  PUNCH_QUEUE_SCHEMA,
  PUNCH_QUEUE_TABLE,
  type PunchQueueRow,
  type QueueRowState,
  type SqlDatabase,
} from './db';

/** The ten signed fields, in canonical order; the only keys ever written to `payload`. */
export const PUNCH_FIELD_NAMES = [
  'pairingId',
  'shopId',
  'employeeId',
  'punchId',
  'phoneTime',
  'offline',
  'locationChecked',
  'distanceMetres',
  'accuracyMetres',
  'mock',
] as const satisfies readonly (keyof AppPunchFields)[];

/**
 * Property names that would carry a position. The queue's input type forbids them so a caller
 * cannot hand the queue a location reading by mistake (R9.2); at run time {@link enqueue} copies
 * only {@link PUNCH_FIELD_NAMES} anyway.
 */
export type CoordinateKey =
  | 'lat'
  | 'lng'
  | 'lon'
  | 'latitude'
  | 'longitude'
  | 'coords'
  | 'coordinates'
  | 'position'
  | 'location';

/** `T` with every coordinate-named property ruled out at the type level. */
export type WithoutCoordinates<T> = T & { readonly [K in CoordinateKey]?: never };

/** What `enqueue` accepts: a signed punch request that carries no coordinates. */
export type EnqueueInput = WithoutCoordinates<AppPunchRequest>;

/** A queued punch as the app reads it back. */
export interface QueuedPunch {
  punchId: string;
  /** The signed request exactly as it must be sent (fields + signature). */
  request: AppPunchRequest;
  /** `request.phoneTime`, the send-order key (R6.5). */
  phoneTime: string;
  /** The phone's guess of this punch's direction, for the home-screen label only (R6.4). */
  directionGuess: PunchDirection;
  state: QueueRowState;
  /** The server's refusal text when `state` is `REFUSED` (R6.13). */
  refusalMessage: string | null;
  /** Failed sends so far (R6.15). */
  attempts: number;
  /** Epoch ms; the row is not sent before this moment. */
  nextAttemptAt: number;
  /** Epoch ms of the save. */
  createdAt: number;
}

export interface PunchQueueOptions {
  /** Phone clock in epoch ms; `Date.now` on the phone, a fake in tests. */
  now?: () => number;
}

const WAITING: QueueRowState = 'WAITING';
const REFUSED: QueueRowState = 'REFUSED';

export class PunchQueue {
  private readonly now: () => number;
  private schemaReady: Promise<void> | undefined;

  constructor(private readonly db: SqlDatabase, options: PunchQueueOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  /**
   * Saves a signed punch (R6.2). Only the ten signed fields and the signature are written; any
   * other property of `input` is dropped. Returns the stored row. Throws when a row with the same
   * `punchId` exists: one punch is saved once.
   */
  async enqueue(input: EnqueueInput, directionGuess: PunchDirection): Promise<QueuedPunch> {
    await this.ready();
    const fields = pickPunchFields(input);
    const signature = requireText(input.signature, 'signature');
    if (directionGuess !== 'IN' && directionGuess !== 'OUT') {
      throw new Error('directionGuess must be IN or OUT');
    }
    const createdAt = this.now();
    await this.db.runAsync(
      `INSERT INTO ${PUNCH_QUEUE_TABLE} (punch_id, payload, signature, phone_time, direction_guess, state, refusal_message, attempts, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.punchId,
        JSON.stringify(fields),
        signature,
        fields.phoneTime,
        directionGuess,
        WAITING,
        null,
        0,
        0,
        createdAt,
      ],
    );
    return {
      punchId: fields.punchId,
      request: { ...fields, signature },
      phoneTime: fields.phoneTime,
      directionGuess,
      state: WAITING,
      refusalMessage: null,
      attempts: 0,
      nextAttemptAt: 0,
      createdAt,
    };
  }

  /**
   * The punch to send now (R6.5): the oldest `WAITING` row by phone time, when its
   * `next_attempt_at` is at or before `now`. Null when nothing waits or the head is still in its
   * retry wait; the order is never skipped.
   */
  async nextWaiting(now: number = this.now()): Promise<QueuedPunch | null> {
    const head = await this.head();
    return head && head.nextAttemptAt <= now ? head : null;
  }

  /**
   * When the head of the queue may next be sent (epoch ms), or null when nothing waits. For the
   * sync worker's timer.
   */
  async nextDueAt(): Promise<number | null> {
    const head = await this.head();
    return head ? head.nextAttemptAt : null;
  }

  /**
   * The server answered the punch (stored, duplicate or replayed): the row is deleted, in the
   * same transaction as `record`, when given, so the answer is never recorded with the punch
   * still queued, nor the punch dropped with the answer unrecorded (R6.7, R9.5). True when a
   * row was deleted.
   */
  async markAnswered(punchId: string, record?: () => Promise<void>): Promise<boolean> {
    await this.ready();
    let deleted = false;
    await this.db.withTransactionAsync(async () => {
      if (record) {
        await record();
      }
      const result = await this.db.runAsync(`DELETE FROM ${PUNCH_QUEUE_TABLE} WHERE punch_id = ?`, [
        punchId,
      ]);
      deleted = result.changes > 0;
    });
    return deleted;
  }

  /**
   * The server refused the punch with a reason (R6.13): the row becomes `REFUSED` with the
   * message, leaves the waiting set and is never sent again. True when a waiting row changed.
   */
  async markRefused(punchId: string, message: string): Promise<boolean> {
    await this.ready();
    const result = await this.db.runAsync(
      `UPDATE ${PUNCH_QUEUE_TABLE} SET state = ?, refusal_message = ? WHERE punch_id = ? AND state = ?`,
      [REFUSED, requireText(message, 'message'), punchId, WAITING],
    );
    return result.changes > 0;
  }

  /** The worker tapped OK on a refusal (R6.14): the refused row is deleted. True when one was. */
  async dismissRefused(punchId: string): Promise<boolean> {
    await this.ready();
    const result = await this.db.runAsync(
      `DELETE FROM ${PUNCH_QUEUE_TABLE} WHERE punch_id = ? AND state = ?`,
      [punchId, REFUSED],
    );
    return result.changes > 0;
  }

  /**
   * A send got no answer (R6.15): the sync worker records the attempt count and the moment before
   * which the row is not sent again. True when a waiting row changed.
   */
  async scheduleRetry(punchId: string, nextAttemptAt: number, attempts: number): Promise<boolean> {
    await this.ready();
    if (!Number.isInteger(attempts) || attempts < 0) {
      throw new Error('attempts must be a non-negative integer');
    }
    if (!Number.isFinite(nextAttemptAt)) {
      throw new Error('nextAttemptAt must be a finite epoch ms');
    }
    const result = await this.db.runAsync(
      `UPDATE ${PUNCH_QUEUE_TABLE} SET attempts = ?, next_attempt_at = ? WHERE punch_id = ? AND state = ?`,
      [attempts, Math.floor(nextAttemptAt), punchId, WAITING],
    );
    return result.changes > 0;
  }

  /** Rows still to be sent, whether due or in a retry wait (R6.16). Refused rows do not count. */
  async waitingCount(): Promise<number> {
    await this.ready();
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${PUNCH_QUEUE_TABLE} WHERE state = ?`,
      [WAITING],
    );
    return row?.n ?? 0;
  }

  /**
   * The guessed direction of the newest waiting punch (latest phone time), or null when none
   * waits. The home screen shows **Check out** after `IN` and **Check in** after `OUT` (R6.4).
   * Refused punches were never recorded by the server and do not count.
   */
  async newestKnownDirection(): Promise<PunchDirection | null> {
    await this.ready();
    const row = await this.db.getFirstAsync<Pick<PunchQueueRow, 'direction_guess'>>(
      `SELECT direction_guess FROM ${PUNCH_QUEUE_TABLE} WHERE state = ? ORDER BY phone_time DESC, created_at DESC LIMIT 1`,
      [WAITING],
    );
    return row ? row.direction_guess : null;
  }

  /** Every refused punch, oldest first, for the refusal cards on the home screen (R6.13). */
  async refused(): Promise<QueuedPunch[]> {
    return this.rows(REFUSED);
  }

  /** Every waiting punch in send order; for tests and the "waiting" list. */
  async waiting(): Promise<QueuedPunch[]> {
    return this.rows(WAITING);
  }

  /** The row for one punch id in either state, or null. */
  async get(punchId: string): Promise<QueuedPunch | null> {
    await this.ready();
    const row = await this.db.getFirstAsync<PunchQueueRow>(
      `SELECT * FROM ${PUNCH_QUEUE_TABLE} WHERE punch_id = ?`,
      [punchId],
    );
    return row ? toQueuedPunch(row) : null;
  }

  /** Deletes every row, both states. Part of the local wipe path when the file cannot be removed. */
  async clear(): Promise<void> {
    await this.ready();
    await this.db.runAsync(`DELETE FROM ${PUNCH_QUEUE_TABLE}`, []);
  }

  // --- internals ---

  private async head(): Promise<QueuedPunch | null> {
    await this.ready();
    const row = await this.db.getFirstAsync<PunchQueueRow>(
      `SELECT * FROM ${PUNCH_QUEUE_TABLE} WHERE state = ? ORDER BY phone_time ASC, created_at ASC LIMIT 1`,
      [WAITING],
    );
    return row ? toQueuedPunch(row) : null;
  }

  private async rows(state: QueueRowState): Promise<QueuedPunch[]> {
    await this.ready();
    const rows = await this.db.getAllAsync<PunchQueueRow>(
      `SELECT * FROM ${PUNCH_QUEUE_TABLE} WHERE state = ? ORDER BY phone_time ASC, created_at ASC`,
      [state],
    );
    return rows.map(toQueuedPunch);
  }

  private ready(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.db.execAsync(PUNCH_QUEUE_SCHEMA).catch((error: unknown) => {
        this.schemaReady = undefined;
        throw error;
      });
    }
    return this.schemaReady;
  }
}

// --- field handling ---

/**
 * Copies exactly the ten signed fields out of `input`, checking their shapes. Everything else on
 * the object, whatever its name, is left behind (R9.2, R9.5).
 */
export function pickPunchFields(input: AppPunchFields): AppPunchFields {
  return {
    pairingId: requireText(input.pairingId, 'pairingId'),
    shopId: requireText(input.shopId, 'shopId'),
    employeeId: requireText(input.employeeId, 'employeeId'),
    punchId: requireText(input.punchId, 'punchId'),
    phoneTime: requireText(input.phoneTime, 'phoneTime'),
    offline: requireBoolean(input.offline, 'offline'),
    locationChecked: requireBoolean(input.locationChecked, 'locationChecked'),
    distanceMetres: requireMetresOrNull(input.distanceMetres, 'distanceMetres'),
    accuracyMetres: requireMetresOrNull(input.accuracyMetres, 'accuracyMetres'),
    mock: requireBoolean(input.mock, 'mock'),
  };
}

function toQueuedPunch(row: PunchQueueRow): QueuedPunch {
  const fields = pickPunchFields(JSON.parse(row.payload) as AppPunchFields);
  return {
    punchId: row.punch_id,
    request: { ...fields, signature: row.signature },
    phoneTime: row.phone_time,
    directionGuess: row.direction_guess,
    state: row.state,
    refusalMessage: row.refusal_message,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
  };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function requireMetresOrNull(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be null or a non-negative whole number of metres`);
  }
  return value;
}
