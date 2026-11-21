/**
 * The sync worker's {@link Triggers} bound to the phone (R6.6): NetInfo for "network is back",
 * `AppState` for "app came to the foreground", `expo-background-task` for the OS-scheduled run
 * while the app is not open. Import this from app code only; tests fire the `Triggers` interface
 * by hand and never load this file (it needs the React Native runtime).
 *
 * Background task, as Expo requires it: `TaskManager.defineTask` must run in the **global scope of
 * the JavaScript bundle**, before any React code and not inside a component or effect, because
 * when the OS wakes the app headlessly only module-level code has run. So the task is defined
 * here, at module scope, the moment this file is imported (`src/app/deps.ts` imports it at
 * start-up). The task body calls whatever {@link Triggers.onBackgroundRun} last registered; before
 * the worker has registered (or after it unregistered) the task does nothing and reports success.
 * `registerTaskAsync` asks the OS to run it at least {@link BACKGROUND_SYNC_MIN_INTERVAL_MINUTES}
 * apart; Android (WorkManager) and iOS (BGTaskScheduler) both treat that as a floor and may run it
 * much later or not at all, so this trigger is best effort on top of the foreground ones. iOS also
 * needs the `expo-background-task` config plugin in `app.json` (adds the `processing` background
 * mode and the permitted task identifier); it is listed there.
 */
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import type { Triggers, Unsubscribe } from './SyncWorker';

/** The background task's name; one per app. */
export const BACKGROUND_SYNC_TASK = 'skat-attendance-sync';

/** Design: "expo-background-task (WorkManager, ≥ 15 min, best effort while the app is not running)". */
export const BACKGROUND_SYNC_MIN_INTERVAL_MINUTES = 15;

/** What the background task runs; set by {@link expoTriggers.onBackgroundRun}. */
let backgroundRun: (() => Promise<void>) | null = null;

// Module scope on purpose: see the file comment. Defining it twice (a Fast Refresh reload) is
// harmless, `defineTask` replaces the executor.
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const run = backgroundRun;
  if (!run) {
    return BackgroundTask.BackgroundTaskResult.Success;
  }
  try {
    await run();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const expoTriggers: Triggers = {
  onNetworkConnected(listener): Unsubscribe {
    // NetInfo calls the listener once with the current state on subscribe; that first call only
    // records the state. Later calls fire the trigger on the edge "not connected → connected",
    // not on every change (a Wi‑Fi ↔ mobile switch while connected is not "network is back").
    let known: boolean | null = null;
    return NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      if (known !== null && connected && !known) {
        listener();
      }
      known = connected;
    });
  },

  onForeground(listener): Unsubscribe {
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') {
        listener();
      }
      previous = next;
    });
    return () => subscription.remove();
  },

  onBackgroundRun(run): Unsubscribe {
    backgroundRun = run;
    // Registration failing (background tasks restricted by the OS, an emulator without Play
    // services) only loses the best-effort trigger; the foreground ones still work.
    void BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: BACKGROUND_SYNC_MIN_INTERVAL_MINUTES,
    }).catch(() => undefined);
    return () => {
      if (backgroundRun === run) {
        backgroundRun = null;
      }
    };
  },
};
