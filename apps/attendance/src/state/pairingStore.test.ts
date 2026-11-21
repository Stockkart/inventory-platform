import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PairingBootstrap } from '@inventory-platform/attendance-protocol';

import { INSTALLATION_ID_KEY, PAIRING_KEY, PairingStore, type SecureStorage } from './pairingStore';

// The Expo modules import react-native; the store is tested through its injected adapter
// (vi.mock is hoisted above the imports).
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'EXPO-UUID' }));

/** In-memory `SecureStorage` that records every call. */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const calls: string[] = [];
  const storage: SecureStorage = {
    async getItem(key) {
      calls.push(`get ${key}`);
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      calls.push(`set ${key}`);
      map.set(key, value);
    },
    async deleteItem(key) {
      calls.push(`delete ${key}`);
      map.delete(key);
    },
  };
  return { storage, map, calls };
}

const bootstrap: PairingBootstrap = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: {
    locationCheck: true,
    shopLat: 28.6139,
    shopLng: 77.209,
    radiusMetres: 100,
    outsideAction: 'FLAG',
  },
  consentVersion: 1,
};

describe('PairingStore', () => {
  let mem: ReturnType<typeof memoryStorage>;
  let uuids: string[];
  let store: PairingStore;

  beforeEach(() => {
    mem = memoryStorage();
    uuids = ['11111111-2222-4333-8444-555555555555', '66666666-7777-4888-9999-aaaaaaaaaaaa'];
    store = new PairingStore({ storage: mem.storage, randomUUID: () => uuids.shift() ?? 'none' });
  });

  describe('installationId', () => {
    it('is made once on first use and then kept', async () => {
      const first = await store.installationId();
      const second = await store.installationId();
      expect(first).toBe('11111111-2222-4333-8444-555555555555');
      expect(second).toBe(first);
      expect(mem.map.get(INSTALLATION_ID_KEY)).toBe(first);
      expect(mem.calls.filter((c) => c.startsWith('set'))).toHaveLength(1);
    });

    it('is lowercased and replaced when the stored value is not a UUID', async () => {
      mem.map.set(INSTALLATION_ID_KEY, 'garbage');
      expect(await store.installationId()).toBe('11111111-2222-4333-8444-555555555555');
      mem.map.set(INSTALLATION_ID_KEY, '66666666-7777-4888-9999-AAAAAAAAAAAA');
      expect(await store.installationId()).toBe('66666666-7777-4888-9999-aaaaaaaaaaaa');
    });
  });

  describe('pairing record', () => {
    it('loads null when not paired', async () => {
      expect(await store.load()).toBeNull();
      expect(await store.isPaired()).toBe(false);
    });

    it('saves exactly the bootstrap fields and loads them back', async () => {
      await store.save(bootstrap);
      expect(await store.load()).toEqual(bootstrap);
      expect(await store.isPaired()).toBe(true);
      expect(Object.keys(JSON.parse(String(mem.map.get(PAIRING_KEY)))).sort()).toEqual(
        [
          'consentVersion',
          'employeeId',
          'employeeName',
          'location',
          'pairingId',
          'shopId',
          'shopName',
        ].sort(),
      );
    });

    it('drops extra fields the server might add so nothing else is stored (R9.3)', async () => {
      await store.save({ ...bootstrap, extra: 'not stored' } as PairingBootstrap);
      expect(mem.map.get(PAIRING_KEY)).not.toContain('not stored');
    });

    it('refuses an incomplete record', async () => {
      await expect(store.save({ ...bootstrap, pairingId: 'short' })).rejects.toThrow(/incomplete/);
      expect(mem.map.has(PAIRING_KEY)).toBe(false);
    });

    it('treats a corrupt record as not paired and removes it', async () => {
      mem.map.set(PAIRING_KEY, '{not json');
      expect(await store.load()).toBeNull();
      expect(mem.map.has(PAIRING_KEY)).toBe(false);
      mem.map.set(PAIRING_KEY, JSON.stringify({ pairingId: bootstrap.pairingId }));
      expect(await store.load()).toBeNull();
      expect(mem.map.has(PAIRING_KEY)).toBe(false);
    });

    it('updates the location settings and the consent version in place', async () => {
      await store.save(bootstrap);
      await store.updateLocation({ locationCheck: false });
      await store.updateConsentVersion(3);
      expect(await store.load()).toEqual({
        ...bootstrap,
        location: { locationCheck: false },
        consentVersion: 3,
      });
    });

    it('cannot update when not paired', async () => {
      await expect(store.updateConsentVersion(2)).rejects.toThrow(/not paired/);
      await expect(store.updateLocation({ locationCheck: false })).rejects.toThrow(/not paired/);
    });
  });

  describe('wipe (R3.3, R9.6)', () => {
    it('deletes the record, the installation id, the queue and the keys', async () => {
      const deleteKeys = vi.fn(async () => undefined);
      const deleteQueue = vi.fn(async () => undefined);
      const wiping = new PairingStore({
        storage: mem.storage,
        randomUUID: () => uuids.shift() ?? 'none',
        deleteKeys,
        deleteQueue,
      });
      await wiping.save(bootstrap);
      await wiping.installationId();

      await wiping.wipe();

      expect(mem.map.size).toBe(0);
      expect(deleteKeys).toHaveBeenCalledTimes(1);
      expect(deleteQueue).toHaveBeenCalledTimes(1);
      expect(await wiping.load()).toBeNull();
      // A new installation id afterwards: nothing from the former pairing is reused.
      expect(await wiping.installationId()).toBe('66666666-7777-4888-9999-aaaaaaaaaaaa');
    });

    it('is safe to call twice, including on a phone that was never paired', async () => {
      const deleteKeys = vi.fn(async () => undefined);
      const wiping = new PairingStore({ storage: mem.storage, deleteKeys });
      await wiping.wipe();
      await wiping.wipe();
      expect(mem.map.size).toBe(0);
      expect(deleteKeys).toHaveBeenCalledTimes(2);
    });

    it('runs every step even when one fails, then rethrows the first failure', async () => {
      const deleteQueue = vi.fn(async () => {
        throw new Error('sqlite busy');
      });
      const deleteKeys = vi.fn(async () => undefined);
      const wiping = new PairingStore({ storage: mem.storage, deleteQueue, deleteKeys });
      await wiping.save(bootstrap);

      await expect(wiping.wipe()).rejects.toThrow('sqlite busy');

      expect(mem.map.has(PAIRING_KEY)).toBe(false);
      expect(deleteKeys).toHaveBeenCalledTimes(1);
    });
  });
});
