/**
 * Composition root: the one place that binds the app's pure modules to their Expo adapters. Screens
 * receive these objects through `RootNavigator` and never import `expo-*` themselves, so each screen
 * is testable with fakes. Importing this file needs the React Native runtime; tests build the same
 * shapes from `FakeBiometricSigner`, `MemoryDatabase` and in-memory storage instead.
 *
 * `pairingStore.wipe()` is given both deleters it composes (R9.6): the hardware keys and the SQLite
 * queue file.
 *
 * Offline queue (R6): the `PunchQueue` and the `HistoryCache` share one lazily opened SQLite file
 * (`lazyQueueDatabase`); a `SyncWorker` is built over them with the phone's triggers
 * (`expoTriggers`: NetInfo, `AppState`, the background task) and started here, so queued punches
 * are sent from the moment the app process is up, whatever screen is showing. A worker stops for
 * good once the server ends its pairing (R3.3), so the `SyncSupervisor` owns it and spawns a fresh
 * one at that moment; screens and `PunchFlow` talk to the supervisor. `expoTriggers` must be
 * imported at start-up because it defines the background task at module scope (Expo's rule); this
 * file's import of it is that start-up import.
 *
 * `PunchFlow` gets the queue, the reachability probe (`serverReachability`: NetInfo, then `GET
 * /me`) and `onQueued` → `SyncWorker.queueChanged()`, which publishes the new queue state to the
 * home screen within the same tick (R6.16) and asks for a send attempt.
 */
import { AppClient } from '../api/appClient';
import { expoRandomUUID, expoSha256 } from '../api/expoCrypto';
import { API_URL } from '../config';
import { readDeviceInfo } from '../device/deviceInfo';
import { HistoryCache } from '../history/HistoryCache';
import { expoLocationProvider } from '../location/expoLocation';
import { LocationReader } from '../location/LocationReader';
import { PairingFlow } from '../pairing/PairingFlow';
import { netInfoConnected } from '../punch/expoNetwork';
import { PunchFlow } from '../punch/PunchFlow';
import { serverReachability } from '../punch/reachability';
import { deleteQueueDatabase, lazyQueueDatabase } from '../queue/expoDb';
import { expoTriggers } from '../queue/expoTriggers';
import { PunchQueue } from '../queue/PunchQueue';
import { SyncSupervisor } from '../queue/SyncSupervisor';
import { SyncWorker, type Unsubscribe } from '../queue/SyncWorker';
import { readAppVersion } from '../settings/appVersion';
import type { BiometricSigner } from '../signer/BiometricSigner';
import { biometricSigner } from '../signer/nativeSigner';
import { PairingStore } from '../state/pairingStore';
import type { PairingEnded } from './pairingEnded';

export interface AppDeps {
  signer: BiometricSigner;
  locationReader: LocationReader;
  pairingStore: PairingStore;
  client: AppClient;
  pairingFlow: PairingFlow;
  punchFlow: PunchFlow;
  queue: PunchQueue;
  historyCache: HistoryCache;
  /** The offline queue's sender, kept alive across unpair → re-pair (`SyncSupervisor`). */
  sync: SyncSupervisor;
  /** `app.json` version plus build number, for the settings screen. */
  appVersion: string;
  /**
   * Fires when the sync worker learns, while sending a queued punch, that the pairing is over and
   * has wiped the phone (R3.3). The navigator shows the pairing screen.
   */
  onPairingEnded(listener: (ended: PairingEnded) => void): Unsubscribe;
}

/** Builds the app's dependencies once, at start-up, and starts the sync worker. */
export function createAppDeps(): AppDeps {
  const signer = biometricSigner;
  const locationReader = new LocationReader(expoLocationProvider);
  const pairingStore = new PairingStore({
    randomUUID: expoRandomUUID,
    deleteKeys: () => signer.deleteKeys(),
    deleteQueue: deleteQueueDatabase,
  });
  const client = new AppClient({
    baseUrl: API_URL,
    signer,
    pairingId: async () => (await pairingStore.load())?.pairingId ?? null,
    sha256: expoSha256,
    randomUUID: expoRandomUUID,
  });
  const pairingFlow = new PairingFlow({
    client,
    signer,
    store: pairingStore,
    device: readDeviceInfo(),
  });

  const db = lazyQueueDatabase();
  const queue = new PunchQueue(db);
  const historyCache = new HistoryCache(db);
  const pairingEndedListeners = new Set<(ended: PairingEnded) => void>();
  const sync = new SyncSupervisor({
    create: (onPairingEnded) =>
      new SyncWorker({
        queue,
        client,
        pairingStore,
        triggers: expoTriggers,
        history: historyCache,
        onPairingEnded,
        onError: (error) => console.warn('[attendance] sync worker', error),
      }),
    onPairingEnded: (ended) => {
      for (const listener of pairingEndedListeners) {
        listener(ended);
      }
    },
  });
  void sync.start().catch((error: unknown) => console.warn('[attendance] sync start', error));

  const punchFlow = new PunchFlow({
    client,
    signer,
    locationReader,
    pairingStore,
    reachability: serverReachability({ client, network: netInfoConnected }),
    queue,
    onQueued: () => sync.queueChanged(),
    uuid: expoRandomUUID,
  });

  return {
    signer,
    locationReader,
    pairingStore,
    client,
    pairingFlow,
    punchFlow,
    queue,
    historyCache,
    sync,
    appVersion: readAppVersion(),
    onPairingEnded(listener) {
      pairingEndedListeners.add(listener);
      return () => {
        pairingEndedListeners.delete(listener);
      };
    },
  };
}
