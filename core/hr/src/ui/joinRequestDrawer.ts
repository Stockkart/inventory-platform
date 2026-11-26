/**
 * Pure pieces of the join-request drawer (worker-app R4.14–R4.17, design "Join-request drawer"):
 * the inline reject state machine and the relative request time. No React, so each transition
 * and each time bucket has a plain unit test.
 */
import {
  formatDateTimeIst,
  formatInstantDate,
  REJECT_REASON_MAX,
} from '@inventory-platform/hr/types';

/** What the drawer is saving: the two approvals of the match card / footer, or the reject. */
export type DrawerSavingMode = 'CREATE' | 'LINK' | 'REJECT';

export type DrawerState =
  /** Reject · Approve in the footer; `error` is the last refusal, shown in the card or footer. */
  | { kind: 'idle'; error: string | null }
  /** The inline reason field is open; `reason` is the raw input, `error` the last failed reject. */
  | { kind: 'rejecting'; reason: string; error: string | null }
  /** A request is in flight; `reason` is kept so a failed reject comes back with it. */
  | { kind: 'saving'; mode: DrawerSavingMode; reason: string }
  /** The drawer asked to close (decision done, Esc, close button, backdrop). */
  | { kind: 'closed' };

export type DrawerAction =
  /** Another request was opened: back to idle. */
  | { type: 'open' }
  /** Footer Reject: open the inline reason field. */
  | { type: 'reject' }
  /** Cancel in the reason field. */
  | { type: 'cancel' }
  /** The reason textarea changed. */
  | { type: 'reason'; value: string }
  /** Confirm reject. */
  | { type: 'confirm' }
  /** Footer Approve (CREATE) or the match card's Link to existing (LINK) / Create new (CREATE). */
  | { type: 'approve'; mode: 'CREATE' | 'LINK' }
  /** The server accepted the decision. */
  | { type: 'ok' }
  /** The server refused (8038–8040, network): the message is shown word for word. */
  | { type: 'error'; message: string }
  /** Esc, the close button or the backdrop. Ignored while saving. */
  | { type: 'close' };

export const DRAWER_IDLE: DrawerState = { kind: 'idle', error: null };

/**
 * ```
 * idle ──Reject──▶ rejecting ──Confirm──▶ saving ──ok──▶ closed
 *   ▲                 │  ▲                   │
 *   └────Cancel───────┘  └──────error────────┘   (reason kept, error shown)
 * idle ──Approve / Link / Create──▶ saving ──ok──▶ closed ──error──▶ idle (+ refusal text)
 * any ──Esc / close / backdrop──▶ closed   (ignored while saving)
 * ```
 * Any action that does not fit the current state leaves it unchanged.
 */
export function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case 'open':
      return DRAWER_IDLE;
    case 'reject':
      return state.kind === 'idle' ? { kind: 'rejecting', reason: '', error: null } : state;
    case 'cancel':
      return state.kind === 'rejecting' ? DRAWER_IDLE : state;
    case 'reason':
      return state.kind === 'rejecting' ? { ...state, reason: action.value } : state;
    case 'confirm':
      return state.kind === 'rejecting' && !reasonTooLong(state.reason)
        ? { kind: 'saving', mode: 'REJECT', reason: state.reason }
        : state;
    case 'approve':
      return state.kind === 'idle' ? { kind: 'saving', mode: action.mode, reason: '' } : state;
    case 'ok':
      return state.kind === 'saving' ? { kind: 'closed' } : state;
    case 'error':
      if (state.kind !== 'saving') return state;
      return state.mode === 'REJECT'
        ? { kind: 'rejecting', reason: state.reason, error: action.message }
        : { kind: 'idle', error: action.message };
    case 'close':
      return state.kind === 'saving' ? state : { kind: 'closed' };
    default:
      return state;
  }
}

/** The raw reason is over the limit (the counter counts raw characters; R4.7). */
export function reasonTooLong(reason: string): boolean {
  return reason.length > REJECT_REASON_MAX;
}

/** "12 / 200": the live counter under the inline reason field. */
export function reasonCounter(reason: string): string {
  return `${reason.length} / ${REJECT_REASON_MAX}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** After this many days the relative form stops being useful; the IST date is shown instead. */
const RELATIVE_DAYS_MAX = 7;

/**
 * "just now" (under a minute), "N min ago", "N h ago", "N d ago" (under 7 days), else the IST
 * calendar date (R4.14). A time in the future (clock skew) reads "just now"; an unreadable
 * instant reads "—".
 */
export function relativeTime(requestedAt: string, now: number | Date = Date.now()): string {
  const at = new Date(requestedAt).getTime();
  if (Number.isNaN(at)) return '—';
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const elapsed = Math.max(0, nowMs - at);
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < RELATIVE_DAYS_MAX * DAY) return `${Math.floor(elapsed / DAY)} d ago`;
  return formatInstantDate(requestedAt);
}

/** "12 May 2026, 2:00 pm IST": the exact time behind a relative one (title and screen readers). */
export function exactTimeIst(requestedAt: string): string {
  const text = formatDateTimeIst(requestedAt);
  return text === '—' || text === requestedAt ? text : `${text} IST`;
}
