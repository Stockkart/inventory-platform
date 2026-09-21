export type PunchOutcome = 'SUCCESS' | 'REJECTED' | 'SERVER_ERROR' | 'NETWORK_ERROR';

/** Generates an Idempotency-Key for one punch attempt. */
export function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Whether to keep the idempotency key after a punch attempt.
 *
 * Retaining a key after a permanent rejection strands the next attempt behind a request
 * that can never succeed. Discarding one after a timeout is the dangerous direction: the
 * punch may well have been recorded, and a fresh key would cook the round twice.
 */
export function keyAfter(outcome: PunchOutcome, key: string): string | null {
  switch (outcome) {
    case 'SUCCESS':
    case 'REJECTED':
      return null;
    case 'SERVER_ERROR':
    case 'NETWORK_ERROR':
      return key;
  }
}
