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

  it('never rejects, because the punch has already succeeded', async () => {
    const queue = createPrintQueue(async () => {
      throw new Error('printer on fire');
    }, vi.fn());

    expect(() => queue.enqueue('k1')).not.toThrow();
    await flush();
    await flush();
  });
});
