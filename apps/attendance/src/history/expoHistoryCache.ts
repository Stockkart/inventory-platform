/**
 * The history cache over the app's real SQLite file. Import this from app code only; tests build a
 * `HistoryCache` over `MemoryDatabase` and never load this file (it needs the React Native runtime
 * through `expo-sqlite`).
 *
 * The cache shares the queue's connection and file (`QUEUE_DB_NAME`), so `PairingStore.wipe()`'s
 * `deleteQueue` step removes the cached punches together with the queue (R3.3, R9.6).
 */
import { openQueueDatabase } from '../queue/expoDb';
import { HistoryCache } from './HistoryCache';

/** The app's one history cache. Resolves once the connection is open. */
export async function openHistoryCache(): Promise<HistoryCache> {
  return new HistoryCache(await openQueueDatabase());
}
