import { useSyncExternalStore, type ReactNode } from 'react';
import type { ProfileTabId } from './ProfileTabs';

/**
 * A profile tab contributed by another package (or the app composition root)
 * without `core/user` having to import it. Used to avoid dependency cycles
 * (e.g. `core/product` owns the barcode label layout screen but the profile
 * page lives here).
 */
export interface ProfileTabExtension {
  /** Unique tab id. Must not collide with a built-in `ProfileTabId`. */
  id: string;
  /** Tab label shown in `ProfileTabs`. */
  label: string;
  /** Renders the tab content when the tab is active. */
  render: () => ReactNode;
  /** Built-in tab to insert this tab after. Defaults to the end of the bar. */
  after?: ProfileTabId;
}

type Listener = () => void;

let extensions: readonly ProfileTabExtension[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Registers (or replaces, by id) a profile tab extension. Safe to call before
 * React mounts; mounted `ProfileTabs`/`ProfilePage` instances re-render.
 */
export function registerProfileTab(tab: ProfileTabExtension): void {
  const next = extensions.filter((existing) => existing.id !== tab.id);
  next.push(tab);
  extensions = next;
  emit();
}

/** Removes a previously registered extension. No-op if the id is unknown. */
export function unregisterProfileTab(id: string): void {
  if (!extensions.some((existing) => existing.id === id)) return;
  extensions = extensions.filter((existing) => existing.id !== id);
  emit();
}

/** Current snapshot of registered extensions (non-reactive). */
export function getProfileTabExtensions(): readonly ProfileTabExtension[] {
  return extensions;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribes to the registry; re-renders when tabs are registered or removed. */
export function useProfileTabExtensions(): readonly ProfileTabExtension[] {
  return useSyncExternalStore(subscribe, getProfileTabExtensions, getProfileTabExtensions);
}
