/**
 * `READY` is a ticket waiting for the cashier to press Print on its own row.
 *
 * A browser grants one popup per user gesture, so a punch spanning two stations could open
 * only its first ticket — the second was blocked and silently became a download. Every
 * ticket after the first therefore waits for a press of its own.
 */
export type PrintState = 'READY' | 'QUEUED' | 'PRINTING' | 'PRINTED' | 'FAILED';

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
 *
 * A ticket already queued or printing is not queued a second time. A punch that resolves
 * twice — a double-resolve, a caller that replays its response — hands the same kotId
 * back, and the ticket strip dedupes by id, so the duplicate would be invisible in the UI
 * while still driving a second print dialog and a second slip carrying the same KOT number
 * to the pass. An id is released once its ticket settles, so Retry after a FAILED still
 * works.
 */
export function createPrintQueue(
  runner: (kotId: string) => Promise<void>,
  onState: PrintStateListener,
): PrintQueue {
  const pending: string[] = [];
  const inFlight = new Set<string>();
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
          inFlight.delete(kotId);
          onState(kotId, 'PRINTED');
        } catch {
          inFlight.delete(kotId);
          onState(kotId, 'FAILED');
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    enqueue(kotId: string) {
      if (inFlight.has(kotId)) return;
      inFlight.add(kotId);
      pending.push(kotId);
      onState(kotId, 'QUEUED');
      void drain();
    },
  };
}
