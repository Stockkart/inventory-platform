/**
 * `expo-sqlite` bound as the queue's {@link SqlDatabase}. Import this from app code only; tests
 * build a `PunchQueue` over `MemoryDatabase` and never load this file (it needs the React Native
 * runtime through `expo`).
 *
 * One connection per process, opened on first use. {@link deleteQueueDatabase} is the
 * `deleteQueue` step `PairingStore.wipe()` runs (R3.3, R9.6): it closes the connection and
 * removes the file, and treats "no such file" as done so a second wipe is harmless.
 *
 * Both tables that live in this file (the punch queue and the history cache) have their idempotent
 * schema run every time a connection is opened. `PunchQueue` and `HistoryCache` run their own
 * schema once per instance, which is not enough here: after a wipe the next open starts a fresh
 * file while the instances built at start-up (`src/app/deps.ts`) live on, so the file must be made
 * whole again by the open itself.
 *
 * {@link lazyQueueDatabase} wraps the connection as an {@link SqlDatabase} whose every call waits
 * for the open first, so the composition root can hand `PunchQueue`, `HistoryCache` and the sync
 * worker a database synchronously at start-up and the file is opened on first use.
 */
import * as SQLite from 'expo-sqlite';

import { PUNCH_HISTORY_SCHEMA } from '../history/HistoryCache';
import { PUNCH_QUEUE_SCHEMA, QUEUE_DB_NAME, type SqlDatabase, type SqlParams } from './db';
import { PunchQueue } from './PunchQueue';

let connection: Promise<SQLite.SQLiteDatabase> | undefined;

/**
 * The queue's database, opened once, with both schemas applied. `SQLiteDatabase` satisfies
 * {@link SqlDatabase} as is.
 */
export function openQueueDatabase(): Promise<SqlDatabase> {
  if (!connection) {
    connection = SQLite.openDatabaseAsync(QUEUE_DB_NAME)
      .then(async (db) => {
        await db.execAsync(PUNCH_QUEUE_SCHEMA);
        await db.execAsync(PUNCH_HISTORY_SCHEMA);
        return db;
      })
      .catch((error: unknown) => {
        connection = undefined;
        throw error;
      });
  }
  return connection;
}

/**
 * Closes the connection (if open) and deletes the SQLite file with every queued punch in it.
 * Resolves when the file is already gone. The next {@link openQueueDatabase} starts a fresh file.
 */
export async function deleteQueueDatabase(): Promise<void> {
  const open = connection;
  connection = undefined;
  if (open) {
    try {
      await (await open).closeAsync();
    } catch {
      // Already closed, or never opened successfully: the file is what matters.
    }
  }
  try {
    await SQLite.deleteDatabaseAsync(QUEUE_DB_NAME);
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

/** True for `expo-sqlite`'s "database not found" error, the only one a wipe may ignore. */
function isNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|no such file|does not exist/i.test(message);
}

/**
 * An {@link SqlDatabase} over the process's connection that opens it on first use and follows a
 * reopen after {@link deleteQueueDatabase}. `withTransactionAsync` runs on the real connection, so
 * `expo-sqlite`'s "no nested transactions" rule still holds.
 */
export function lazyQueueDatabase(): SqlDatabase {
  return {
    async execAsync(source) {
      return (await openQueueDatabase()).execAsync(source);
    },
    async runAsync(source, params) {
      return (await openQueueDatabase()).runAsync(source, params);
    },
    async getAllAsync<T>(source: string, params: SqlParams): Promise<T[]> {
      return (await openQueueDatabase()).getAllAsync<T>(source, params);
    },
    async getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null> {
      return (await openQueueDatabase()).getFirstAsync<T>(source, params);
    },
    async withTransactionAsync(task) {
      return (await openQueueDatabase()).withTransactionAsync(task);
    },
    async closeAsync() {
      const open = connection;
      if (open) {
        await (await open).closeAsync();
      }
    },
  };
}

/** The app's one queue, over the real database. Resolves once the connection is open. */
export async function openPunchQueue(): Promise<PunchQueue> {
  return new PunchQueue(await openQueueDatabase());
}
