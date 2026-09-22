const PREFIX = 'cafe.kot.punchKey:';

/**
 * Where the Idempotency-Key of an unsettled kitchen-facing write is parked.
 *
 * Originally scoped to a punching purchase; it now also parks the key for a KOT tab's
 * flush, scoped by `tabId` instead. Either way the caller supplies whatever id scopes the
 * attempt (a purchase or a tab) — the store itself has no opinion on which.
 *
 * The key only has to survive one thing: the component that holds it going away while the
 * request it belongs to is still unaccounted for. The mounting UI can remount on a scope-id
 * change, and a reload takes it too — so a key kept only in a ref is lost exactly when the
 * network dropped mid-request. The server, which recorded that request and (for a flush)
 * already created the tickets, then answers the next press as if there were nothing to do —
 * "Nothing new to send" — while the tickets exist and no paper ever printed. Replaying the
 * same key instead returns those tickets so they can be printed.
 *
 * `sessionStorage` scopes it to the browser session and clears itself when that session
 * ends, which is the right lifetime for something that must never outlive the shift. Every
 * access is guarded: in a private window the accessor itself can throw, and a full quota can
 * reject a write. A key that cannot be stored is not fatal — it degrades to the old ref-only
 * behaviour — so nothing here rethrows.
 */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readPunchKey(scopeId: string): string | null {
  if (!scopeId) return null;
  try {
    const value = storage()?.getItem(PREFIX + scopeId);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function writePunchKey(scopeId: string, key: string): void {
  if (!scopeId) return;
  try {
    storage()?.setItem(PREFIX + scopeId, key);
  } catch {
    // Storage is unavailable or full. The request still carries the key in memory.
  }
}

export function clearPunchKey(scopeId: string): void {
  if (!scopeId) return;
  try {
    storage()?.removeItem(PREFIX + scopeId);
  } catch {
    // Nothing to do — a stale key is only ever replayed against the request it belongs to.
  }
}
