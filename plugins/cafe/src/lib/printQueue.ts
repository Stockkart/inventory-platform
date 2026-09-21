export type PrintState = 'QUEUED' | 'PRINTING' | 'PRINTED' | 'FAILED';

export type PrintStateListener = (kotId: string, state: PrintState) => void;

export interface PrintQueue {
  enqueue(kotId: string): void;
}

/**
 * Prints tickets one at a time.
 *
 * A local printer or bridge is a shared device; two documents sent at once interleave or
 * drop. Failures are reported through the listener rather than thrown: by the time
 * anything is queued the punch has already succeeded, and a printer problem must not
 * present itself as a failed punch.
 */
export function createPrintQueue(
  runner: (kotId: string) => Promise<void>,
  onState: PrintStateListener,
): PrintQueue {
  const pending: string[] = [];
  let running = false;

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (pending.length > 0) {
        const kotId = pending.shift() as string;
        onState(kotId, 'PRINTING');
        try {
          await runner(kotId);
          onState(kotId, 'PRINTED');
        } catch {
          onState(kotId, 'FAILED');
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    enqueue(kotId: string) {
      pending.push(kotId);
      onState(kotId, 'QUEUED');
      void drain();
    },
  };
}
