import type { AttemptOutcome } from '../lib/idempotencyAttempt';

/** Classifies a failure so the caller knows whether to keep the idempotency key. */
export function outcomeOf(error: unknown): AttemptOutcome {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (typeof status !== 'number' || status <= 0) return 'NETWORK_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REJECTED';
}
