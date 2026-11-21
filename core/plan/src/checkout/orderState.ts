/**
 * What the payment page does with a plan order, read from the order `status` the API returns on
 * checkout and on verify. The API owns the states; this only groups them for the screen.
 *
 * - `open`: waiting for payment (CREATED, PAYMENT_PENDING, or no status from an older API).
 * - `confirming`: the money is in, the plan is still being applied (PAID, FULFILLING), or applying
 *   it failed and support has to finish it (FULFILMENT_FAILED). Never open the gateway again.
 * - `done`: FULFILLED.
 * - `closed`: the order can no longer be paid (PAYMENT_FAILED, EXPIRED, CANCELLED, REFUNDED, ...).
 */
export type OrderStage = 'open' | 'confirming' | 'done' | 'closed';

const OPEN = new Set(['CREATED', 'PAYMENT_PENDING']);
const CONFIRMING = new Set(['PAID', 'FULFILLING', 'FULFILMENT_FAILED']);

export function orderStage(status: string | null | undefined): OrderStage {
  if (status == null || status === '' || OPEN.has(status)) return 'open';
  if (status === 'FULFILLED') return 'done';
  if (CONFIRMING.has(status)) return 'confirming';
  return 'closed';
}

/** Message while a paid order is still being applied. */
export function confirmingMessage(status: string | null | undefined): string {
  return status === 'FULFILMENT_FAILED'
    ? 'Payment received, but we could not apply it to your plan yet. Our team has been notified; you will not be charged again.'
    : 'Payment received, confirming your order… You will not be charged again.';
}
