import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findPendingPrintJob,
  listCachedPrintJobs,
  putCachedPrintJob,
  removeCachedPrintJob,
  type CachedPrintJob,
} from './printJobCache';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

function job(overrides: Partial<CachedPrintJob> = {}): CachedPrintJob {
  return {
    source: 'SALE',
    documentId: 'p-1',
    documentKind: 'INVOICE',
    documentNumber: 'T001148',
    bridgeJobId: null,
    sentAt: 1_000,
    watchUntil: 14_000,
    expiresAt: 121_000,
    ...overrides,
  };
}

describe('printJobCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    localStorage.setItem('x_shop_id', 'shop-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds a job for the same document until it expires', () => {
    putCachedPrintJob(job());

    expect(findPendingPrintJob('SALE', 'p-1', 50_000)).toMatchObject({ documentId: 'p-1' });
    expect(findPendingPrintJob('SALE', 'p-1', 121_000)).toBeNull();
    expect(findPendingPrintJob('REFUND', 'p-1', 50_000)).toBeNull();
  });

  it('keeps expired jobs in the list, since they still have to be reported', () => {
    putCachedPrintJob(job({ expiresAt: 10 }));

    expect(listCachedPrintJobs()).toHaveLength(1);
  });

  it('replaces the entry for a document rather than adding a second one', () => {
    putCachedPrintJob(job());
    putCachedPrintJob(job({ bridgeJobId: 'j-7' }));

    expect(listCachedPrintJobs()).toEqual([job({ bridgeJobId: 'j-7' })]);
  });

  it('removes only the document asked for, and clears the key when empty', () => {
    putCachedPrintJob(job());
    putCachedPrintJob(job({ documentId: 'p-2' }));

    removeCachedPrintJob('SALE', 'p-1');
    expect(listCachedPrintJobs().map((entry) => entry.documentId)).toEqual(['p-2']);

    removeCachedPrintJob('SALE', 'p-2');
    expect(localStorage.getItem('sk.printJobs.v1.shop-1')).toBeNull();
  });

  it('keeps each shop separate', () => {
    putCachedPrintJob(job());
    localStorage.setItem('x_shop_id', 'shop-2');

    expect(listCachedPrintJobs()).toEqual([]);
  });

  it('ignores unreadable or malformed entries', () => {
    localStorage.setItem('sk.printJobs.v1.shop-1', 'not json');
    expect(listCachedPrintJobs()).toEqual([]);

    localStorage.setItem('sk.printJobs.v1.shop-1', JSON.stringify([{ documentId: 'p-1' }, job()]));
    expect(listCachedPrintJobs()).toEqual([job()]);
  });

  it('fails soft when storage throws, as in private mode', () => {
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error('SecurityError');
    };
    broken.setItem = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('localStorage', broken);

    expect(() => putCachedPrintJob(job())).not.toThrow();
    expect(listCachedPrintJobs()).toEqual([]);
    expect(findPendingPrintJob('SALE', 'p-1', 0)).toBeNull();
  });

  it('stores nothing without an active shop', () => {
    localStorage.removeItem('x_shop_id');
    putCachedPrintJob(job());

    expect(listCachedPrintJobs()).toEqual([]);
    expect(localStorage.length).toBe(0);
  });
});
