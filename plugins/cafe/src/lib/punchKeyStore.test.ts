/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { clearPunchKey, readPunchKey, writePunchKey } from './punchKeyStore';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('punchKeyStore', () => {
  it('returns null for a scope that has never had a key written', () => {
    expect(readPunchKey('t1')).toBeNull();
  });

  it('round-trips a key written for a scope id', () => {
    writePunchKey('t1', 'key-1');
    expect(readPunchKey('t1')).toBe('key-1');
  });

  it('keeps keys for different scope ids independent — a tab flush and a purchase punch', () => {
    writePunchKey('purchase-1', 'punch-key');
    writePunchKey('tab-1', 'flush-key');

    expect(readPunchKey('purchase-1')).toBe('punch-key');
    expect(readPunchKey('tab-1')).toBe('flush-key');
  });

  it('survives a simulated remount: the key persists in sessionStorage, not a ref', () => {
    // Park the key the way a mutation does, before its request resolves.
    writePunchKey('t1', 'key-1');

    // A remount recreates the component's `useRef(null)` — nothing in memory carries the
    // key forward. Only a fresh read from the store (sessionStorage) can recover it.
    const afterRemount = readPunchKey('t1');

    expect(afterRemount).toBe('key-1');
  });

  it('clears a key once its request settles', () => {
    writePunchKey('t1', 'key-1');
    clearPunchKey('t1');

    expect(readPunchKey('t1')).toBeNull();
  });

  it('treats a blank scope id as a no-op rather than throwing', () => {
    expect(() => writePunchKey('', 'key-1')).not.toThrow();
    expect(readPunchKey('')).toBeNull();
    expect(() => clearPunchKey('')).not.toThrow();
  });
});
