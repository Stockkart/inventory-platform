const PREFIX = 'cafe.kot.punchKey:';

/**
 * Where the Idempotency-Key of an unsettled punch is parked.
 *
 * The key only has to survive one thing: the component that holds it going away while the
 * request it belongs to is still unaccounted for. The mounting UI can remount on a
 * `purchaseId` change, and a reload takes it too — so a key kept only in a
 * ref is lost exactly when the network dropped mid-punch. The server, which recorded that
 * punch and created the tickets, then answers the next press with zero deltas: "Nothing new
 * to send", while the tickets exist and no paper ever printed. Replaying the same key
 * instead returns those tickets so they can be printed.
 *
 * `sessionStorage` scopes it to the tab and clears itself when the tab closes, which is the
 * right lifetime for something that must never outlive the shift. Every access is guarded:
 * in a private window the accessor itself can throw, and a full quota can reject a write.
 * A key that cannot be stored is not fatal — it degrades to the old ref-only behaviour —
 * so nothing here rethrows.
 */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPunchKey(purchaseId: string): string | null {
  if (!purchaseId) return null;
  try {
    const value = storage()?.getItem(PREFIX + purchaseId);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function writePunchKey(purchaseId: string, key: string): void {
  if (!purchaseId) return;
  try {
    storage()?.setItem(PREFIX + purchaseId, key);
  } catch {
    // Storage is unavailable or full. The punch still carries the key in memory.
  }
}

export function clearPunchKey(purchaseId: string): void {
  if (!purchaseId) return;
  try {
    storage()?.removeItem(PREFIX + purchaseId);
  } catch {
    // Nothing to do — a stale key is only ever replayed against the punch it belongs to.
  }
}
