const PREFIX = 'cafe.kot.punchKey:';

/**
 * What is parked for one unsettled attempt: the Idempotency-Key, and the request's own
 * variables when the caller has any.
 *
 * The variables are not decoration. A key alone is enough for the *server* to replay its
 * answer, but not always enough for the client to ask again: a request that carries a body
 * cannot be rebuilt from the key once whatever the cashier chose is out of memory. The punch
 * itself has no body (the server derives the delta), so it parks no variables — but the slot
 * stays, because the retention rule and the store are shared with writes that do.
 */
export interface ParkedAttempt<TVariables = unknown> {
  key: string;
  variables?: TVariables;
}

function parse(raw: string): ParkedAttempt | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && typeof (parsed as ParkedAttempt).key === 'string') {
      const record = parsed as ParkedAttempt;
      return record.key.trim() ? record : null;
    }
  } catch {
    // Not JSON: a bare key parked by an earlier build of this app, still in the same
    // browser session. Honour it rather than stranding the attempt it belongs to.
  }
  return { key: trimmed };
}

/**
 * Where the Idempotency-Key of an unsettled kitchen-facing write is parked.
 *
 * Scoped by whatever id the caller says scopes the attempt — a purchase for a punch, a
 * ticket for a reprint. The store itself has no opinion on which.
 *
 * The key only has to survive one thing: the component that holds it going away while the
 * request it belongs to is still unaccounted for. The mounting UI can remount on a scope-id
 * change, and a reload takes it too — so a key kept only in a ref is lost exactly when the
 * network dropped mid-request. The server, which recorded that request and already created
 * the tickets, then answers the next press as if there were nothing to do —
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

/** The whole parked record — the key and, when the caller parked them, its variables. */
export function readParkedAttempt<TVariables = unknown>(
  scopeId: string,
): ParkedAttempt<TVariables> | null {
  if (!scopeId) return null;
  try {
    const value = storage()?.getItem(PREFIX + scopeId);
    return value ? (parse(value) as ParkedAttempt<TVariables> | null) : null;
  } catch {
    return null;
  }
}

/** Just the key, for the request that is about to go out. */
export function readPunchKey(scopeId: string): string | null {
  return readParkedAttempt(scopeId)?.key ?? null;
}

export function writePunchKey(scopeId: string, key: string, variables?: unknown): void {
  if (!scopeId) return;
  try {
    storage()?.setItem(PREFIX + scopeId, JSON.stringify({ key, variables }));
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
