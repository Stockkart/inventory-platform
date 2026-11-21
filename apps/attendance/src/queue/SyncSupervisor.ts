/**
 * Keeps one live {@link SyncWorker} for the whole app process (task 14.3 composition).
 *
 * A `SyncWorker` stops for good when the server tells it the pairing is over (R3.3: it wipes the
 * phone and never sends again; `SyncWorker.test.ts` pins that). That is right for the worker, but
 * the process lives on: a manager may unpair the phone and pair it again without the app being
 * closed, and from then on new offline punches must be sent. The supervisor spawns a fresh worker
 * the moment the old one reports `onPairingEnded`, starts it, and keeps the home screen's
 * subscription and `PunchFlow`'s `queueChanged` pointed at whichever worker is current. Callers
 * hold the supervisor, never a worker.
 *
 * Pure: no Expo or React Native import. `src/app/deps.ts` passes a factory that binds the real
 * triggers; tests pass one over `MemoryDatabase` and a fake client.
 */
import type { PairingEnded } from '../app/pairingEnded';
import type { QueueState, SyncWorker, Unsubscribe } from './SyncWorker';

export interface SyncSupervisorDeps {
  /** Builds a worker whose `onPairingEnded` is the given callback (the supervisor's). */
  create(onPairingEnded: (ended: PairingEnded & { wipeError?: unknown }) => void): SyncWorker;
  /** Told after a worker ended and its replacement is up; the navigator shows the pairing screen. */
  onPairingEnded?: (ended: PairingEnded & { wipeError?: unknown }) => void;
}

export class SyncSupervisor {
  private worker: SyncWorker;
  private detach: Unsubscribe = () => undefined;
  private readonly listeners = new Set<(state: QueueState) => void>();
  private generation = 0;

  constructor(private readonly deps: SyncSupervisorDeps) {
    this.worker = this.spawn();
  }

  /** The worker in service right now; for tests and diagnostics. */
  get current(): SyncWorker {
    return this.worker;
  }

  /** How many workers have been spawned so far (1 at construction). */
  get workersSpawned(): number {
    return this.generation;
  }

  /** Starts the current worker (`SyncWorker.start`). */
  start(): Promise<void> {
    return this.worker.start();
  }

  /** Stops the current worker; no replacement is spawned. */
  stop(): void {
    this.worker.stop();
  }

  /** Listens for queue state across worker replacements; called at once with the current state. */
  subscribe(listener: (state: QueueState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.worker.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** `SyncWorker.queueChanged` on the current worker (a punch was just saved). */
  queueChanged(): Promise<void> {
    return this.worker.queueChanged();
  }

  /** `SyncWorker.dismissRefused` on the current worker (R6.14). */
  dismissRefused(punchId: string): Promise<boolean> {
    return this.worker.dismissRefused(punchId);
  }

  private spawn(): SyncWorker {
    this.generation += 1;
    const worker = this.deps.create((ended) => this.replace(worker, ended));
    this.detach = worker.subscribe((state) => this.publish(state));
    return worker;
  }

  private replace(ended: SyncWorker, reason: PairingEnded & { wipeError?: unknown }): void {
    if (ended !== this.worker) {
      return; // a late report from a worker already replaced
    }
    this.detach();
    this.worker = this.spawn();
    void this.worker.start().catch(() => undefined);
    this.deps.onPairingEnded?.(reason);
  }

  private publish(state: QueueState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
