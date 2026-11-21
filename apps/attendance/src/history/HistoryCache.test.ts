import { describe, expect, it } from 'vitest';

import type { PunchResponse } from '@inventory-platform/attendance-protocol';

import { MemoryDatabase } from '../queue/memoryDb';
import {
  HistoryCache,
  PUNCH_HISTORY_TABLE,
  sortNewestFirst,
  toHistoryEntries,
  toHistoryEntry,
  type HistoryEntry,
} from './HistoryCache';
import { addDays, historyWindow, kolkataDate, kolkataTime } from './kolkataDates';

// 2025-04-03 09:12 IST = 03:42 UTC
const NOW = Date.UTC(2025, 3, 3, 3, 42, 0);

function entry(
  punchId: string,
  atIso: string,
  overrides: Partial<Omit<HistoryEntry, 'punchId' | 'atMs'>> = {},
): HistoryEntry {
  const atMs = Date.parse(atIso);
  return {
    punchId,
    atMs,
    localDate: kolkataDate(atMs),
    localTime: kolkataTime(atMs),
    direction: 'IN',
    flags: [],
    counted: true,
    ...overrides,
  };
}

function cache(): { cache: HistoryCache; db: MemoryDatabase } {
  const db = new MemoryDatabase();
  return { cache: new HistoryCache(db, { now: () => NOW }), db };
}

describe('HistoryCache', () => {
  it('replaceAll stores the server answer and lists it newest first', async () => {
    const { cache: c, db } = cache();
    const older = entry('p1', '2025-04-01T04:00:00Z');
    const newer = entry('p2', '2025-04-03T03:40:00Z', {
      direction: 'OUT',
      flags: ['OUTSIDE_SHOP'],
    });
    const middle = entry('p3', '2025-04-02T12:30:00Z', { counted: false });

    const stored = await c.replaceAll([older, newer, middle], historyWindow(NOW).from);

    expect(stored.map((e) => e.punchId)).toEqual(['p2', 'p3', 'p1']);
    expect(await c.list()).toEqual(stored);
    expect(await c.count()).toBe(3);
    // Nothing but the display fields is written (R9.3).
    expect(Object.keys(db.dump(PUNCH_HISTORY_TABLE)[0]).sort()).toEqual([
      'counted',
      'direction',
      'flags',
      'local_date',
      'local_time',
      'punch_id',
      'punched_at_ms',
      'saved_at',
    ]);
    const listed = await c.list();
    expect(listed[0]).toMatchObject({ direction: 'OUT', flags: ['OUTSIDE_SHOP'], counted: true });
    expect(listed[1]).toMatchObject({ counted: false });
  });

  it('replaceAll drops the previous content and anything older than the 31-day window', async () => {
    const { cache: c } = cache();
    const { from } = historyWindow(NOW);
    expect(from).toBe('2025-03-04');

    await c.replaceAll([entry('old-answer', '2025-04-02T04:00:00Z')], from);

    const edge = entry('edge', '2025-03-03T18:30:00Z'); // 2025-03-04 00:00 IST: first day in window
    const outside = entry('out', '2025-03-03T18:29:59Z'); // 2025-03-03 23:59:59 IST: pruned
    const today = entry('today', '2025-04-03T03:00:00Z');
    const stored = await c.replaceAll([outside, edge, today], from);

    expect(stored.map((e) => e.punchId)).toEqual(['today', 'edge']);
    expect((await c.list()).map((e) => e.punchId)).toEqual(['today', 'edge']);
  });

  it('prune deletes entries whose attendance date is before from, and reports how many', async () => {
    const { cache: c } = cache();
    const from = historyWindow(NOW).from;
    await c.replaceAll(
      [
        entry('a', '2025-03-10T04:00:00Z'),
        entry('b', '2025-03-20T04:00:00Z'),
        entry('c', '2025-04-03T03:00:00Z'),
      ],
      '2025-01-01',
    );
    expect(await c.count()).toBe(3);

    // The window moved on 20 days: 'a' and 'b' are now outside it.
    const later = addDays(from, 20);
    expect(await c.prune(later)).toBe(2);
    expect((await c.list()).map((e) => e.punchId)).toEqual(['c']);
    expect(await c.prune(later)).toBe(0);
  });

  it('a punch id given twice is stored once', async () => {
    const { cache: c } = cache();
    const first = entry('dup', '2025-04-03T03:00:00Z');
    const again = entry('dup', '2025-04-03T03:00:00Z', { direction: 'OUT' });
    const stored = await c.replaceAll([first, again], '2025-03-04');
    expect(stored).toHaveLength(1);
    expect(stored[0].direction).toBe('IN');
    expect(await c.count()).toBe(1);
  });

  it('clear empties the table', async () => {
    const { cache: c } = cache();
    await c.replaceAll([entry('x', '2025-04-03T03:00:00Z')], '2025-03-04');
    await c.clear();
    expect(await c.count()).toBe(0);
    expect(await c.list()).toEqual([]);
  });

  it('upsert adds one answered punch and replaces an entry with the same id, without a transaction', async () => {
    const { cache: c, db } = cache();
    await c.replaceAll([entry('kept', '2025-04-02T04:00:00Z')], '2025-03-04');

    await c.upsert(entry('new', '2025-04-03T03:40:00Z', { flags: ['RECORDED_OFFLINE'] }));
    await c.upsert(entry('new', '2025-04-03T03:40:00Z', { direction: 'OUT', counted: false }));

    const listed = await c.list();
    expect(listed.map((e) => e.punchId)).toEqual(['new', 'kept']);
    expect(listed[0]).toMatchObject({ direction: 'OUT', counted: false, flags: [] });
    expect(await c.count()).toBe(2);

    // Usable inside the queue's transaction: no nested BEGIN.
    await db.withTransactionAsync(async () => {
      await c.upsert(entry('inside', '2025-04-03T03:41:00Z'));
    });
    expect(await c.count()).toBe(3);
  });

  it('a schema failure is retried on the next call rather than cached', async () => {
    const db = new MemoryDatabase();
    let fail = true;
    const original = db.execAsync.bind(db);
    db.execAsync = async (source: string) => {
      if (fail) {
        fail = false;
        throw new Error('disk busy');
      }
      return original(source);
    };
    const c = new HistoryCache(db);
    await expect(c.count()).rejects.toThrow('disk busy');
    expect(await c.count()).toBe(0);
  });
});

describe('toHistoryEntry', () => {
  const punch: PunchResponse = {
    id: 'abc',
    employeeId: '5f1a2b3c4d5e6f7081920002',
    at: '2025-04-03T03:42:08Z',
    source: 'BIOMETRIC_APP',
    direction: 'IN',
    flags: ['RECORDED_OFFLINE'],
    counted: true,
  };

  it('uses the server date and time when given, else works them out in Asia/Kolkata', () => {
    expect(toHistoryEntry({ ...punch, localDate: '2025-04-03', time: '09:12' })).toMatchObject({
      punchId: 'abc',
      localDate: '2025-04-03',
      localTime: '09:12',
      direction: 'IN',
      flags: ['RECORDED_OFFLINE'],
      counted: true,
    });
    expect(toHistoryEntry(punch)).toMatchObject({ localDate: '2025-04-03', localTime: '09:12' });
  });

  it('treats a missing counted as counted, missing flags as none, and keeps unknown flags', () => {
    const e = toHistoryEntry({ ...punch, counted: undefined, flags: null });
    expect(e).toMatchObject({ counted: true, flags: [] });
    const unknown = toHistoryEntry({
      ...punch,
      flags: ['NEW_FLAG_FROM_A_NEWER_BACKEND'] as unknown as PunchResponse['flags'],
    });
    expect(unknown?.flags).toEqual(['NEW_FLAG_FROM_A_NEWER_BACKEND']);
  });

  it('returns null for an unreadable row and drops it from the list', () => {
    expect(toHistoryEntry({ ...punch, at: 'not a date' })).toBeNull();
    expect(toHistoryEntry({ ...punch, id: '' })).toBeNull();
    const entries = toHistoryEntries([punch, { ...punch, id: 'bad', at: '???' }]);
    expect(entries.map((e) => e.punchId)).toEqual(['abc']);
  });

  it('toHistoryEntries sorts newest first with a total order', () => {
    const list = toHistoryEntries([
      { ...punch, id: 'a', at: '2025-04-01T03:00:00Z' },
      { ...punch, id: 'c', at: '2025-04-03T03:00:00Z' },
      { ...punch, id: 'b', at: '2025-04-03T03:00:00Z' },
    ]);
    expect(list.map((e) => e.punchId)).toEqual(['c', 'b', 'a']);
    expect(sortNewestFirst(list.reverse()).map((e) => e.punchId)).toEqual(['c', 'b', 'a']);
  });
});
