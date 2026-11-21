import { describe, expect, it } from 'vitest';

import {
  CodeAttemptLockout,
  LOCKOUT_DURATION_MS,
  lockoutCountdown,
  minutesFromLockedMessage,
} from './CodeAttemptLockout';

describe('CodeAttemptLockout', () => {
  it('locks on the fifth refusal inside 15 minutes and opens again after 15 minutes', () => {
    const lockout = new CodeAttemptLockout();
    const t0 = 1_000_000;

    for (let i = 0; i < 4; i++) {
      expect(lockout.recordRefusal(t0 + i * 60_000)).toBe(0);
    }
    expect(lockout.recordRefusal(t0 + 4 * 60_000)).toBe(LOCKOUT_DURATION_MS);
    expect(lockout.isLocked(t0 + 4 * 60_000)).toBe(true);
    expect(lockout.remainingMs(t0 + 4 * 60_000 + 1)).toBe(LOCKOUT_DURATION_MS - 1);
    expect(lockout.remainingMs(t0 + 19 * 60_000)).toBe(0);
    expect(lockout.isLocked(t0 + 19 * 60_000)).toBe(false);
  });

  it('only counts refusals inside the sliding 15-minute window', () => {
    const lockout = new CodeAttemptLockout();
    const t0 = 0;
    for (let i = 0; i < 4; i++) {
      lockout.recordRefusal(t0 + i * 1000);
    }
    // 15 minutes after the first four: they have aged out, so this is refusal 1 of a new window.
    expect(lockout.recordRefusal(t0 + 15 * 60_000 + 5000)).toBe(0);
  });

  it('lockFor never shortens an open lock and reset clears everything', () => {
    const lockout = new CodeAttemptLockout();
    lockout.lockFor(10 * 60_000, 0);
    lockout.lockFor(2 * 60_000, 0);
    expect(lockout.remainingMs(0)).toBe(10 * 60_000);
    lockout.lockFor(12 * 60_000, 0);
    expect(lockout.remainingMs(0)).toBe(12 * 60_000);
    lockout.reset();
    expect(lockout.remainingMs(0)).toBe(0);
  });
});

describe('lockoutCountdown', () => {
  it('shows minutes (rounded up) above a minute and seconds below', () => {
    expect(lockoutCountdown(15 * 60_000)).toBe(
      'Too many wrong codes. Wait 15 minutes and try again.',
    );
    expect(lockoutCountdown(61_000)).toBe('Too many wrong codes. Wait 2 minutes and try again.');
    expect(lockoutCountdown(60_000)).toBe('Too many wrong codes. Wait 1 minute and try again.');
    expect(lockoutCountdown(59_000)).toBe('Too many wrong codes. Wait 59 seconds and try again.');
    expect(lockoutCountdown(1)).toBe('Too many wrong codes. Wait 1 second and try again.');
  });
});

describe('minutesFromLockedMessage', () => {
  it('reads the minutes out of the server text and null from anything else', () => {
    expect(minutesFromLockedMessage('Too many wrong codes. Wait 7 minutes and try again.')).toBe(7);
    expect(minutesFromLockedMessage('Too many wrong codes. Wait 1 minute and try again.')).toBe(1);
    expect(minutesFromLockedMessage('This code has expired.')).toBeNull();
  });
});
