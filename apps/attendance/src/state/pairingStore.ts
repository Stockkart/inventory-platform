/**
 * What the Attendance app keeps about its pairing (design "Attendance app" table, R9.3), in the
 * phone's secure store (`expo-secure-store`: Android Keystore-encrypted SharedPreferences, iOS
 * Keychain). Exactly these items are written, nothing else:
 *
 * - the pairing record: `pairingId`, `shopId`, `employeeId`, `employeeName`, `shopName`, the
 *   shop's Location check settings as last received, and the consent version agreed to;
 * - the `installationId`: a UUID made on first use; a reinstall makes a new one (R2.11).
 *
 * Never stored here: coordinates of the worker, keys (they live in the signer's hardware key
 * store), punches (the SQLite queue), a phone number or any biometric data (R2.16, R9.1).
 *
 * `wipe()` (R3.3, R9.6) deletes the record and the installation id, then runs the injected
 * deleters for the SQLite queue file (task 14.1) and the two hardware keys (task 12.2). Every
 * step tolerates "already gone", so calling it twice is safe; each step runs even when an earlier
 * one failed, and the first failure is rethrown at the end so the caller knows the phone is not
 * clean.
 *
 * The module is pure apart from the two Expo adapters at the bottom, which are the defaults and
 * are replaced in tests.
 */
import { randomUUID as expoRandomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type {
  AppLocationSettings,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

/** The pairing record as stored; the same fields as `PairingBootstrap` (R2.9, R9.3). */
export interface PairingRecord {
  pairingId: string;
  shopId: string;
  employeeId: string;
  employeeName: string;
  shopName: string;
  /** The shop's Location check settings as last received from the server. */
  location: AppLocationSettings;
  /** The consent version the worker agreed to (R9.13). */
  consentVersion: number;
}

/** Minimal key–value secure storage; `expo-secure-store` behind one interface. */
export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  /** Must resolve when the key does not exist. */
  deleteItem(key: string): Promise<void>;
}

/**
 * One deleter `wipe()` composes: the SQLite queue file (task 14.1) or the signer's keys (task
 * 12.2). Must tolerate "nothing to delete".
 */
export type WipeStep = () => Promise<void>;

export interface PairingStoreOptions {
  storage?: SecureStorage;
  randomUUID?: () => string;
  /** Deletes the hardware key pair(s); `BiometricSigner.deleteKeys` once task 12.2 lands. */
  deleteKeys?: WipeStep;
  /** Deletes the offline queue (the SQLite file) once task 14.1 lands. */
  deleteQueue?: WipeStep;
}

/** Secure-store keys. One JSON blob for the record keeps the write atomic. */
export const PAIRING_KEY = 'skat.pairing';
export const INSTALLATION_ID_KEY = 'skat.installationId';

const OBJECT_ID = /^[0-9a-f]{24}$/;

export class PairingStore {
  private readonly storage: SecureStorage;
  private readonly randomUUID: () => string;
  private readonly deleteKeys: WipeStep;
  private readonly deleteQueue: WipeStep;

  constructor(options: PairingStoreOptions = {}) {
    this.storage = options.storage ?? expoSecureStorage;
    this.randomUUID = options.randomUUID ?? expoRandomUUID;
    this.deleteKeys = options.deleteKeys ?? noop;
    this.deleteQueue = options.deleteQueue ?? noop;
  }

  /**
   * The installation id, made on first call and kept until {@link wipe} or an uninstall. Always a
   * lowercase UUID, which is what the server's claim validation and the canonical builders accept.
   */
  async installationId(): Promise<string> {
    const existing = await this.storage.getItem(INSTALLATION_ID_KEY);
    if (existing && isUuid(existing)) {
      return existing.toLowerCase();
    }
    const created = this.randomUUID().toLowerCase();
    await this.storage.setItem(INSTALLATION_ID_KEY, created);
    return created;
  }

  /** The stored pairing, or null when the phone is not paired (or the record is unreadable). */
  async load(): Promise<PairingRecord | null> {
    const raw = await this.storage.getItem(PAIRING_KEY);
    if (raw == null) {
      return null;
    }
    const parsed = parseRecord(raw);
    if (parsed == null) {
      // A corrupt record is as good as none: the app shows the pairing screen.
      await this.storage.deleteItem(PAIRING_KEY);
    }
    return parsed;
  }

  /** True when a readable pairing record exists. */
  async isPaired(): Promise<boolean> {
    return (await this.load()) != null;
  }

  /** Stores the pairing the server answered on `complete` (R2.9). Replaces any earlier record. */
  async save(pairing: PairingBootstrap | PairingRecord): Promise<void> {
    const record: PairingRecord = {
      pairingId: pairing.pairingId,
      shopId: pairing.shopId,
      employeeId: pairing.employeeId,
      employeeName: pairing.employeeName,
      shopName: pairing.shopName,
      location: pairing.location,
      consentVersion: pairing.consentVersion,
    };
    if (!isRecord(record)) {
      throw new Error('pairing record is incomplete');
    }
    await this.storage.setItem(PAIRING_KEY, JSON.stringify(record));
  }

  /** Keeps the Location check settings current from every `GET /me` answer (R6.2, R9.3). */
  async updateLocation(location: AppLocationSettings): Promise<void> {
    await this.update((record) => ({ ...record, location }));
  }

  /** Records the version the worker agreed to on re-consent (R9.13). */
  async updateConsentVersion(consentVersion: number): Promise<void> {
    await this.update((record) => ({ ...record, consentVersion }));
  }

  /**
   * Deletes everything the former pairing left on the phone (R9.6): the record, the installation
   * id, the offline queue and the keys. Safe to call twice. Runs every step and rethrows the first
   * failure afterwards.
   */
  async wipe(): Promise<void> {
    const failures: unknown[] = [];
    const steps: WipeStep[] = [
      () => this.storage.deleteItem(PAIRING_KEY),
      () => this.storage.deleteItem(INSTALLATION_ID_KEY),
      this.deleteQueue,
      this.deleteKeys,
    ];
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw failures[0];
    }
  }

  private async update(change: (record: PairingRecord) => PairingRecord): Promise<void> {
    const current = await this.load();
    if (current == null) {
      throw new Error('not paired');
    }
    await this.storage.setItem(PAIRING_KEY, JSON.stringify(change(current)));
  }
}

// --- parsing ---

function parseRecord(raw: string): PairingRecord | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is PairingRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    isObjectId(v['pairingId']) &&
    isObjectId(v['shopId']) &&
    isObjectId(v['employeeId']) &&
    typeof v['employeeName'] === 'string' &&
    typeof v['shopName'] === 'string' &&
    typeof v['location'] === 'object' &&
    v['location'] !== null &&
    typeof (v['location'] as Record<string, unknown>)['locationCheck'] === 'boolean' &&
    typeof v['consentVersion'] === 'number' &&
    Number.isInteger(v['consentVersion'])
  );
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );
}

async function noop(): Promise<void> {
  // nothing to delete yet
}

// --- Expo adapter (default) ---

/**
 * `expo-secure-store` as {@link SecureStorage}. `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the iOS
 * Keychain items out of backups and off other devices, the same scope as the Secure Enclave keys;
 * Android ignores the option.
 */
export const expoSecureStorage: SecureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS),
  deleteItem: (key) => SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
};

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// No module-level singleton on purpose: the app's one store is built where the signer (12.2) and
// the queue (14.1) exist, so `wipe()` always has both deleters:
//   new PairingStore({ deleteKeys: signer.deleteKeys, deleteQueue: punchQueue.deleteFile })
