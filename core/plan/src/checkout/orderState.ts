import type { OrderPhase } from '@inventory-platform/plan/types';

/**
 * What the payment page does with a plan order, from the `phase` the API returns on checkout,
 * verify and cancel (or, on an older API without it, the raw `status`). The API owns the states;
 * this only maps them to the screen.
 *
 * - `open`: waiting for payment (AWAITING_PAYMENT; CREATED, PAYMENT_PENDING; or nothing at all).
 * - `confirming`: the money is in and the plan is being applied, or applying it failed and support
 *   finishes it (PROCESSING; PAID, FULFILLING, FULFILMENT_FAILED). Never open the gateway again.
 * - `done`: FULFILLED.
 * - `closed`: the order can no longer be paid (FAILED, ENDED; PAYMENT_FAILED, EXPIRED, CANCELLED...).
 */
export type OrderStage = 'open' | 'confirming' | 'done' | 'closed';

export interface OrderState {
  phase?: OrderPhase | null;
  status?: string | null;
}

const PHASE_STAGE: Record<OrderPhase, OrderStage> = {
  AWAITING_PAYMENT: 'open',
  PROCESSING: 'confirming',
  FULFILLED: 'done',
  FAILED: 'closed',
  ENDED: 'closed',
};

const OPEN = new Set(['CREATED', 'PAYMENT_PENDING']);
const CONFIRMING = new Set(['PAID', 'FULFILLING', 'FULFILMENT_FAILED']);

export function orderStage({ phase, status }: OrderState): OrderStage {
  if (phase && phase in PHASE_STAGE) return PHASE_STAGE[phase];
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
