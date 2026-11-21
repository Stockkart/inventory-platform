/**
 * The app's own copy of the pairing-code lockout (R2.5): after 5 refused code attempts from one
 * installation within 15 minutes, no further attempt is made for 15 minutes and the worker is told
 * how long to wait. The server enforces the same rule (`AppRateLimiter`, `code-fail:<installationId>`)
 * and answers `HR_PAIRING_CODE_LOCKED` with the minutes left; {@link lockFor} mirrors that answer so
 * the countdown on the phone matches the server's.
 *
 * Pure: time is passed in as epoch milliseconds. One instance lives as long as the `PairingFlow`
 * that owns it; a reinstall starts clean, like a new installation id does on the server.
 */

/** R2.5: refusals that count before the lock engages. */
export const LOCKOUT_LIMIT = 5;
/** R2.5: the window the refusals must fall in. */
export const LOCKOUT_WINDOW_MS = 15 * 60_000;
/** R2.5: how long attempts are refused once locked. */
export const LOCKOUT_DURATION_MS = 15 * 60_000;

export class CodeAttemptLockout {
  private refusals: number[] = [];
  private lockedUntil: number | null = null;

  constructor(
    private readonly limit = LOCKOUT_LIMIT,
    private readonly windowMs = LOCKOUT_WINDOW_MS,
    private readonly durationMs = LOCKOUT_DURATION_MS,
  ) {}

  /** Milliseconds until an attempt is allowed again; 0 when not locked. */
  remainingMs(now: number): number {
    if (this.lockedUntil == null) {
      return 0;
    }
    const left = this.lockedUntil - now;
    if (left <= 0) {
      this.lockedUntil = null;
      this.refusals = [];
      return 0;
    }
    return left;
  }

  /** True while attempts are refused locally. */
  isLocked(now: number): boolean {
    return this.remainingMs(now) > 0;
  }

  /**
   * Records one refused code attempt. The `limit`-th refusal inside `windowMs` starts the lock;
   * returns the milliseconds left on it, or 0 when still open.
   */
  recordRefusal(now: number): number {
    if (this.isLocked(now)) {
      return this.remainingMs(now);
    }
    this.refusals = this.refusals.filter((t) => now - t < this.windowMs);
    this.refusals.push(now);
    if (this.refusals.length >= this.limit) {
      this.lockedUntil = now + this.durationMs;
      return this.durationMs;
    }
    return 0;
  }

  /** Locks for `ms` from `now` (the server said so: `HR_PAIRING_CODE_LOCKED`). Never shortens an open lock. */
  lockFor(ms: number, now: number): void {
    const until = now + Math.max(0, ms);
    if (this.lockedUntil == null || until > this.lockedUntil) {
      this.lockedUntil = until;
    }
  }

  /** Forgets every refusal (a pairing completed). */
  reset(): void {
    this.refusals = [];
    this.lockedUntil = null;
  }
}

/** "Wait 15 minutes" / "Wait 1 minute" / "Wait 40 seconds": the countdown line under the lock. */
export function lockoutCountdown(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Too many wrong codes. Wait ${minutes} ${
      minutes === 1 ? 'minute' : 'minutes'
    } and try again.`;
  }
  return `Too many wrong codes. Wait ${seconds} ${
    seconds === 1 ? 'second' : 'seconds'
  } and try again.`;
}

/** The minutes in a server `HR_PAIRING_CODE_LOCKED` text ("Wait %d minutes"), or null when absent. */
export function minutesFromLockedMessage(message: string): number | null {
  const match = /Wait (\d+) minute/.exec(message);
  return match ? Number(match[1]) : null;
}
