import { describe, expect, it, vi } from 'vitest';
import { createPrintQueue } from './printQueue';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createPrintQueue', () => {
  it('prints one ticket at a time, never concurrently', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const runner = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await flush();
      inFlight -= 1;
    });
    const onState = vi.fn();
    const queue = createPrintQueue(runner, onState);

    queue.enqueue('k1');
    queue.enqueue('k2');
    await flush();
    await flush();
    await flush();

    expect(maxInFlight).toBe(1);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('reports each ticket moving through its own states', async () => {
    const onState = vi.fn();
    const queue = createPrintQueue(async () => {
      // intentionally empty
    }, onState);

    queue.enqueue('k1');
    await flush();
    await flush();

    expect(onState.mock.calls).toEqual([
      ['k1', 'QUEUED'],
      ['k1', 'PRINTING'],
      ['k1', 'PRINTED'],
    ]);
  });

  it('marks one ticket failed and still prints the next', async () => {
    const onState = vi.fn();
    const runner = vi.fn(async (kotId: string) => {
      if (kotId === 'k1') throw new Error('printer offline');
    });
    const queue = createPrintQueue(runner, onState);

    queue.enqueue('k1');
    queue.enqueue('k2');
    await flush();
    await flush();
    await flush();
    await flush();

    // A failed KITCHEN ticket must not stop the BAR ticket.
    expect(onState).toHaveBeenCalledWith('k1', 'FAILED');
    expect(onState).toHaveBeenCalledWith('k2', 'PRINTED');
  });

  /**
   * The previous version of this test only asserted that `enqueue` did not throw — which it
   * cannot, being synchronous and void-returning. Deleting the try/catch inside `drain` left
   * it green, with the failure escaping as an unhandled rejection. Both halves of the real
   * property are asserted here: the failure is *reported through the listener*, and nothing
   * escapes the drain loop.
   */
  it('reports a printer failure through the listener instead of escaping the drain', async () => {
    const escaped: unknown[] = [];
    const onUnhandled = (reason: unknown) => escaped.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const onState = vi.fn();
      const queue = createPrintQueue(async () => {
        throw new Error('printer on fire');
      }, onState);

      expect(() => queue.enqueue('k1')).not.toThrow();
      await flush();
      await flush();

      expect(onState).toHaveBeenCalledWith('k1', 'FAILED');
      expect(escaped).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  /**
   * The dedupe. A caller that replays its response — a resumed flush, a retried request the
   * server answers from its idempotency record — hands back a kotId that has already been
   * queued. Printing it again puts a second slip carrying the same KOT number at the pass,
   * and that second slip is NOT stamped REPRINT (only `/reprint` stamps), so a cook reads it
   * as a second order. This is the property the KOT screen's own dedupe leans on.
   */
  it('does not queue a ticket that is already waiting to print', async () => {
    const runner = vi.fn(async () => {
      await flush();
    });
    const onState = vi.fn();
    const queue = createPrintQueue(runner, onState);

    queue.enqueue('k1');
    queue.enqueue('k1'); // the same ticket handed back a second time
    await flush();
    await flush();
    await flush();

    expect(runner).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls.filter(([, state]) => state === 'QUEUED')).toHaveLength(1);
  });

  it('does not queue a ticket that is currently printing', async () => {
    let release: () => void = () => undefined;
    const runner = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const queue = createPrintQueue(runner, vi.fn());

    queue.enqueue('k1');
    await flush(); // k1 is now PRINTING, no longer in `pending`
    queue.enqueue('k1');
    await flush();

    expect(runner).toHaveBeenCalledTimes(1);
    release();
    await flush();
    await flush();
  });

  it('releases a ticket once it settles, so Retry after a failure still prints', async () => {
    const runner = vi.fn(async (kotId: string) => {
      if (runner.mock.calls.length === 1) throw new Error(`printer offline for ${kotId}`);
    });
    const onState = vi.fn();
    const queue = createPrintQueue(runner, onState);

    queue.enqueue('k1');
    await flush();
    await flush();
    expect(onState).toHaveBeenCalledWith('k1', 'FAILED');

    // Retry is the same enqueue. A dedupe that never released the id would swallow it.
    queue.enqueue('k1');
    await flush();
    await flush();

    expect(runner).toHaveBeenCalledTimes(2);
    expect(onState).toHaveBeenCalledWith('k1', 'PRINTED');
  });

  it('releases a ticket after a successful print too, so a deliberate reprint is possible', async () => {
    const runner = vi.fn(async () => {
      // intentionally empty
    });
    const queue = createPrintQueue(runner, vi.fn());

    queue.enqueue('k1');
    await flush();
    await flush();
    queue.enqueue('k1');
    await flush();
    await flush();

    expect(runner).toHaveBeenCalledTimes(2);
  });
});
