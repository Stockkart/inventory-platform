// Worker-app 20.4: the join-request drawer's pure pieces (R4.14, R4.16, R4.7).
import { describe, expect, it } from 'vitest';
import {
  DRAWER_IDLE,
  drawerReducer,
  exactTimeIst,
  reasonCounter,
  reasonTooLong,
  relativeTime,
  type DrawerState,
} from './joinRequestDrawer';

const REJECTING: DrawerState = { kind: 'rejecting', reason: 'Wrong shop', error: null };
const SAVING_REJECT: DrawerState = { kind: 'saving', mode: 'REJECT', reason: 'Wrong shop' };
const SAVING_LINK: DrawerState = { kind: 'saving', mode: 'LINK', reason: '' };
const SAVING_CREATE: DrawerState = { kind: 'saving', mode: 'CREATE', reason: '' };
const CLOSED: DrawerState = { kind: 'closed' };

describe('drawerReducer (R4.16): every transition', () => {
  it('idle —Reject→ rejecting with an empty reason', () => {
    expect(drawerReducer(DRAWER_IDLE, { type: 'reject' })).toEqual({
      kind: 'rejecting',
      reason: '',
      error: null,
    });
  });

  it('rejecting —Cancel→ idle, dropping the reason and any error', () => {
    expect(
      drawerReducer({ kind: 'rejecting', reason: 'x', error: 'boom' }, { type: 'cancel' }),
    ).toEqual(DRAWER_IDLE);
  });

  it('rejecting —reason→ keeps the raw text as typed (trimming is the server body, not the field)', () => {
    expect(drawerReducer(REJECTING, { type: 'reason', value: '  Ask Ramesh ' })).toEqual({
      kind: 'rejecting',
      reason: '  Ask Ramesh ',
      error: null,
    });
  });

  it('rejecting —Confirm→ saving REJECT with the reason kept', () => {
    expect(drawerReducer(REJECTING, { type: 'confirm' })).toEqual(SAVING_REJECT);
  });

  it('rejecting —Confirm→ stays put when the raw reason is over 200 characters', () => {
    const long: DrawerState = { kind: 'rejecting', reason: 'a'.repeat(201), error: null };
    expect(drawerReducer(long, { type: 'confirm' })).toBe(long);
  });

  it('idle —Approve / Link to existing / Create new→ saving with that mode', () => {
    expect(drawerReducer(DRAWER_IDLE, { type: 'approve', mode: 'CREATE' })).toEqual(SAVING_CREATE);
    expect(drawerReducer(DRAWER_IDLE, { type: 'approve', mode: 'LINK' })).toEqual(SAVING_LINK);
  });

  it('saving —ok→ closed, for every mode', () => {
    for (const s of [SAVING_REJECT, SAVING_LINK, SAVING_CREATE]) {
      expect(drawerReducer(s, { type: 'ok' })).toEqual(CLOSED);
    }
  });

  it('saving REJECT —error→ back to rejecting with the reason and the message', () => {
    expect(drawerReducer(SAVING_REJECT, { type: 'error', message: 'Network down' })).toEqual({
      kind: 'rejecting',
      reason: 'Wrong shop',
      error: 'Network down',
    });
  });

  it('saving LINK / CREATE —error→ idle with the refusal word for word', () => {
    const msg = 'EMP-014 is already linked to another login';
    expect(drawerReducer(SAVING_LINK, { type: 'error', message: msg })).toEqual({
      kind: 'idle',
      error: msg,
    });
    expect(
      drawerReducer(SAVING_CREATE, { type: 'error', message: 'This request was already handled' }),
    ).toEqual({
      kind: 'idle',
      error: 'This request was already handled',
    });
  });

  it('close works from idle and rejecting, and is ignored while saving', () => {
    expect(drawerReducer(DRAWER_IDLE, { type: 'close' })).toEqual(CLOSED);
    expect(drawerReducer(REJECTING, { type: 'close' })).toEqual(CLOSED);
    expect(drawerReducer(SAVING_REJECT, { type: 'close' })).toBe(SAVING_REJECT);
    expect(drawerReducer(SAVING_LINK, { type: 'close' })).toBe(SAVING_LINK);
  });

  it('open resets any state to idle (another request was opened)', () => {
    for (const s of [REJECTING, SAVING_LINK, CLOSED, { kind: 'idle', error: 'x' } as DrawerState]) {
      expect(drawerReducer(s, { type: 'open' })).toEqual(DRAWER_IDLE);
    }
  });

  it('actions that do not fit the state leave it unchanged', () => {
    expect(drawerReducer(DRAWER_IDLE, { type: 'cancel' })).toBe(DRAWER_IDLE);
    expect(drawerReducer(DRAWER_IDLE, { type: 'confirm' })).toBe(DRAWER_IDLE);
    expect(drawerReducer(DRAWER_IDLE, { type: 'reason', value: 'x' })).toBe(DRAWER_IDLE);
    expect(drawerReducer(DRAWER_IDLE, { type: 'ok' })).toBe(DRAWER_IDLE);
    expect(drawerReducer(DRAWER_IDLE, { type: 'error', message: 'x' })).toBe(DRAWER_IDLE);
    expect(drawerReducer(REJECTING, { type: 'reject' })).toBe(REJECTING);
    expect(drawerReducer(REJECTING, { type: 'approve', mode: 'LINK' })).toBe(REJECTING);
    expect(drawerReducer(SAVING_LINK, { type: 'reject' })).toBe(SAVING_LINK);
    expect(drawerReducer(SAVING_LINK, { type: 'reason', value: 'x' })).toBe(SAVING_LINK);
    expect(drawerReducer(CLOSED, { type: 'reject' })).toBe(CLOSED);
    expect(drawerReducer(CLOSED, { type: 'ok' })).toBe(CLOSED);
  });
});

describe('reason counter and limit (R4.7)', () => {
  it('counts the raw input, spaces included', () => {
    expect(reasonCounter('')).toBe('0 / 200');
    expect(reasonCounter('   ')).toBe('3 / 200');
    expect(reasonTooLong('a'.repeat(200))).toBe(false);
    expect(reasonTooLong('a'.repeat(201))).toBe(true);
  });
});

describe('relativeTime (R4.14) buckets', () => {
  const now = Date.UTC(2026, 4, 14, 9, 12, 0); // 14 May 2026, 09:12 UTC
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;
  const H = 60 * MIN;
  const D = 24 * H;

  it('"just now" under a minute, including a future instant (clock skew)', () => {
    expect(relativeTime(ago(0), now)).toBe('just now');
    expect(relativeTime(ago(59_999), now)).toBe('just now');
    expect(relativeTime(new Date(now + 5 * MIN).toISOString(), now)).toBe('just now');
  });

  it('"N min ago" from 1 to 59 minutes', () => {
    expect(relativeTime(ago(MIN), now)).toBe('1 min ago');
    expect(relativeTime(ago(59 * MIN + 59_000), now)).toBe('59 min ago');
  });

  it('"N h ago" from 1 to 23 hours', () => {
    expect(relativeTime(ago(H), now)).toBe('1 h ago');
    expect(relativeTime(ago(2 * H + 30 * MIN), now)).toBe('2 h ago');
    expect(relativeTime(ago(23 * H + 59 * MIN), now)).toBe('23 h ago');
  });

  it('"N d ago" from 1 to 6 days', () => {
    expect(relativeTime(ago(D), now)).toBe('1 d ago');
    expect(relativeTime(ago(3 * D + 5 * H), now)).toBe('3 d ago');
    expect(relativeTime(ago(6 * D + 23 * H), now)).toBe('6 d ago');
  });

  it('the IST calendar date from 7 days on', () => {
    expect(relativeTime(ago(7 * D), now)).toBe('7 May 2026');
    expect(relativeTime('2025-12-31T20:00:00Z', now)).toBe('1 Jan 2026'); // 01:30 IST next day
  });

  it('accepts a Date for now and reads "—" for an unreadable instant', () => {
    expect(relativeTime(ago(2 * H), new Date(now))).toBe('2 h ago');
    expect(relativeTime('not a date', now)).toBe('—');
  });
});

describe('exactTimeIst', () => {
  it('spells the IST timestamp with the zone, and passes "—" / junk through', () => {
    expect(exactTimeIst('2026-05-12T08:30:00Z')).toBe('12 May 2026, 2:00 pm IST');
    expect(exactTimeIst('')).toBe('—');
    expect(exactTimeIst('junk')).toBe('junk');
  });
});
