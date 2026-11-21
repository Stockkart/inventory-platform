/**
 * Public surface of `src/queue`. The bound `expo-sqlite` connection (`./expoDb`) and the NetInfo /
 * AppState / background-task bindings (`./expoTriggers`) are exported from their own files only,
 * so importing the queue, the worker, their types or the in-memory database never touches `expo`
 * or `react-native`.
 */
export { PUNCH_QUEUE_SCHEMA, PUNCH_QUEUE_TABLE, QUEUE_DB_NAME } from './db';
export type {
  PunchQueueRow,
  QueueRowState,
  SqlDatabase,
  SqlParams,
  SqlRunResult,
  SqlValue,
} from './db';
export { PUNCH_FIELD_NAMES, PunchQueue, pickPunchFields } from './PunchQueue';
export type {
  CoordinateKey,
  EnqueueInput,
  PunchQueueOptions,
  QueuedPunch,
  WithoutCoordinates,
} from './PunchQueue';
export { MemoryDatabase } from './memoryDb';
export {
  FIRST_RETRY_WAIT_MS,
  MAX_RETRY_WAIT_MS,
  MAX_TRIGGER_DELAY_MS,
  MIN_ATTEMPT_GAP_MS,
  SyncWorker,
  historyEntryFor,
  retryWaitMs,
} from './SyncWorker';
export { SyncSupervisor } from './SyncSupervisor';
export type { SyncSupervisorDeps } from './SyncSupervisor';
export type {
  HistoryRecorder,
  QueueState,
  SyncClient,
  SyncQueue,
  SyncTimers,
  SyncTrigger,
  SyncWorkerDeps,
  Triggers,
  Unsubscribe,
} from './SyncWorker';
