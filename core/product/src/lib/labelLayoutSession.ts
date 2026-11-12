import { useAuthStore } from '@inventory-platform/session';
import type { LabelLayoutResponse } from '../model/labelLayout.types';

/**
 * Module-level cache of the most recently received `LabelLayoutResponse`.
 *
 * This is server state, not UI state, so it is deliberately not a Zustand store.
 * `barcodesApi.labels` / `labelLayoutApi.get|save` populate it; only
 * `openLocalBarcodeLabelPrint` reads it (Req 7.9). Absence is advisory: callers
 * fall back to `DEFAULT_LAYOUT` (Req 7.10).
 *
 * The cache is shop-scoped, so it is cleared whenever the active shop changes
 * or the user logs out (see the `useAuthStore` subscription below).
 */
let cached: LabelLayoutResponse | null = null;

export function setLabelLayoutSession(layout: LabelLayoutResponse): void {
  cached = layout;
}

export function getLabelLayoutSession(): LabelLayoutResponse | null {
  return cached;
}

export function clearLabelLayoutSession(): void {
  cached = null;
}

export const labelLayoutSession = {
  set: setLabelLayoutSession,
  get: getLabelLayoutSession,
  clear: clearLabelLayoutSession,
};

/**
 * Shop-switch / logout reset.
 *
 * `platform/session` does not expose a dedicated `onShopContextReset` hook; the
 * canonical reset points (`login`, `clearSession`, `switchActiveShop`) all end
 * up mutating `useAuthStore` (`user.shopId` changes, or `isAuthenticated`
 * flips to false). Subscribing to the store covers every one of them without
 * requiring `apps/inventory` to wire anything.
 *
 * Guarded so the subscription is only installed in a browser; on the server
 * the module stays a plain in-memory cache.
 */
if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prev) => {
    const shopChanged = state.user?.shopId !== prev.user?.shopId;
    const loggedOut = prev.isAuthenticated && !state.isAuthenticated;
    if (shopChanged || loggedOut) {
      clearLabelLayoutSession();
    }
  });
}
