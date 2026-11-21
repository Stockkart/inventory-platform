import { describe, expect, it } from 'vitest';

import { PUNCH_QUEUE_SCHEMA } from './db';
import { MemoryDatabase } from './memoryDb';

async function withTable(): Promise<MemoryDatabase> {
  const db = new MemoryDatabase();
  await db.execAsync(
    `CREATE TABLE t (id TEXT PRIMARY KEY NOT NULL, n INTEGER NOT NULL DEFAULT 0, s TEXT, kind TEXT NOT NULL CHECK (kind IN ('A', 'B')));
     CREATE INDEX IF NOT EXISTS t_n ON t (n);`,
  );
  return db;
}

describe('MemoryDatabase', () => {
  it('runs the queue schema and reports an empty table', async () => {
    const db = new MemoryDatabase();
    await db.execAsync(PUNCH_QUEUE_SCHEMA);
    await db.execAsync(PUNCH_QUEUE_SCHEMA); // IF NOT EXISTS
    expect(
      await db.getFirstAsync('SELECT COUNT(*) AS n FROM punch_queue WHERE state = ?', ['WAITING']),
    ).toEqual({ n: 0 });
  });

  it('inserts with defaults, selects with where / order / limit, counts', async () => {
    const db = await withTable();
    await db.runAsync('INSERT INTO t (id, n, kind) VALUES (?, ?, ?)', ['a', 2, 'A']);
    await db.runAsync("INSERT INTO t (id, kind) VALUES (?, 'B')", ['b']);
    await db.runAsync('INSERT INTO t (id, n, s, kind) VALUES (?, ?, ?, ?)', ['c', 5, 'x', 'A']);

    expect(await db.getAllAsync('SELECT id FROM t WHERE kind = ? ORDER BY n DESC', ['A'])).toEqual([
      { id: 'c' },
      { id: 'a' },
    ]);
    expect(await db.getAllAsync('SELECT id, n FROM t ORDER BY n ASC, id DESC LIMIT 2', [])).toEqual(
      [
        { id: 'b', n: 0 },
        { id: 'a', n: 2 },
      ],
    );
    expect(await db.getFirstAsync('SELECT COUNT(*) AS c FROM t WHERE n >= ?', [2])).toEqual({
      c: 2,
    });
    expect(await db.getAllAsync('SELECT id FROM t WHERE s IS NULL ORDER BY id', [])).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
    expect(await db.getFirstAsync('SELECT * FROM t WHERE id = ?', ['zzz'])).toBeNull();
  });

  it('updates and deletes, reporting changes', async () => {
    const db = await withTable();
    await db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['a', 'A']);
    await db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['b', 'A']);
    expect(
      (await db.runAsync('UPDATE t SET n = ?, s = ? WHERE id = ? AND kind = ?', [7, 'y', 'a', 'A']))
        .changes,
    ).toBe(1);
    expect((await db.runAsync('UPDATE t SET n = 1 WHERE id = ?', ['nope'])).changes).toBe(0);
    expect(await db.getFirstAsync('SELECT n, s FROM t WHERE id = ?', ['a'])).toEqual({
      n: 7,
      s: 'y',
    });
    expect((await db.runAsync('DELETE FROM t WHERE n < ?', [5])).changes).toBe(1);
    expect(db.dump('t').map((row) => row['id'])).toEqual(['a']);
  });

  it('enforces primary key, NOT NULL and CHECK constraints', async () => {
    const db = await withTable();
    await db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['a', 'A']);
    await expect(db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['a', 'B'])).rejects.toThrow(
      /UNIQUE/,
    );
    await expect(db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['b', 'C'])).rejects.toThrow(
      /CHECK/,
    );
    await expect(
      db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['b', null]),
    ).rejects.toThrow(/NOT NULL/);
    await expect(db.runAsync('UPDATE t SET kind = ? WHERE id = ?', ['C', 'a'])).rejects.toThrow(
      /CHECK/,
    );
    await expect(db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['b'])).rejects.toThrow(
      /parameters/,
    );
  });

  it('rolls back a transaction whose task throws, and refuses nesting', async () => {
    const db = await withTable();
    await db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['a', 'A']);
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM t WHERE id = ?', ['a']);
        await db.runAsync('INSERT INTO t (id, kind) VALUES (?, ?)', ['b', 'B']);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(db.dump('t').map((row) => row['id'])).toEqual(['a']);

    await db.withTransactionAsync(async () => {
      await expect(db.withTransactionAsync(async () => undefined)).rejects.toThrow(/transaction/);
    });
  });

  it('refuses statements it does not understand and use after close', async () => {
    const db = await withTable();
    await expect(db.getAllAsync('SELECT id FROM t WHERE n LIKE ?', ['x'])).rejects.toThrow();
    await expect(db.execAsync('DROP TABLE t')).rejects.toThrow(/unsupported/);
    await db.closeAsync();
    await expect(db.getAllAsync('SELECT * FROM t', [])).rejects.toThrow(/closed/);
  });
});
