import { MAX_TAPE_ENTRIES, type TapeEntry } from './calculatorEngine';

/**
 * Calculator panel persistence. Client-only: the tape, memory register, panel
 * position and open flag live in this browser and are never sent anywhere.
 */

const CALC_KEY_PREFIX = 'sk-calculator-panel';

export interface CalculatorPanelSnapshot {
  version: 1;
  savedAt: number;
  open: boolean;
  x: number | null;
  y: number | null;
  memory: number;
  tape: TapeEntry[];
}

/**
 * One storage key per shop: counter machines are shared, so one shop's working
 * numbers must not surface for the next. The caller passes the shop id it got
 * from the session store, so a save always lands under the shop the state was
 * loaded for — even when it runs just after a shop switch.
 */
function calculatorKey(shopId: string | null | undefined): string | null {
  const id = shopId?.trim();
  return id ? `${CALC_KEY_PREFIX}:${id}` : null;
}

function isTapeEntry(value: unknown): value is TapeEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<TapeEntry>;
  return (
    typeof row.id === 'string' &&
    typeof row.expression === 'string' &&
    typeof row.result === 'string'
  );
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The saved snapshot, or null when there is none or it is unreadable. Unlike the
 * product-entry draft there is no max age: a stale tape is an inert scratchpad, and
 * ageing it out would only destroy history the user may still want.
 */
export function loadCalculatorPanelState(
  shopId: string | null | undefined,
): CalculatorPanelSnapshot | null {
  const key = calculatorKey(shopId);
  if (!key) return null;
  let raw: string | null;
  try {
    // Browsers set to block site data throw on access rather than returning null.
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CalculatorPanelSnapshot>;
    if (parsed?.version !== 1) return null;
    const tape = Array.isArray(parsed.tape)
      ? parsed.tape.filter(isTapeEntry).slice(0, MAX_TAPE_ENTRIES)
      : [];
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      open: parsed.open === true,
      x: finiteOrNull(parsed.x),
      y: finiteOrNull(parsed.y),
      memory: finiteOrNull(parsed.memory) ?? 0,
      tape,
    };
  } catch {
    return null;
  }
}

/**
 * Persist the snapshot. Every failure is swallowed — QuotaExceededError, blocked
 * site data, serialization problems alike. Persistence is a convenience here; a
 * calculator that stops working because storage is full would be the worse bug.
 */
export function saveCalculatorPanelState(
  shopId: string | null | undefined,
  snapshot: Omit<CalculatorPanelSnapshot, 'version' | 'savedAt'>,
): void {
  const key = calculatorKey(shopId);
  if (!key) return;
  try {
    const payload: CalculatorPanelSnapshot = {
      ...snapshot,
      tape: snapshot.tape.slice(0, MAX_TAPE_ENTRIES),
      version: 1,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* nothing further we can do; the calculator keeps working in memory */
  }
}
