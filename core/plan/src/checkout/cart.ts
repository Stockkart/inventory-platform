import { isApiError } from '@inventory-platform/api-client';
import type {
  AddOnResponse,
  PlanResponse,
  QuoteRequest,
  VoucherRejectedDetails,
  VoucherRejection,
} from '@inventory-platform/plan/types';
import { formatRupees } from '../ui/planPricing';

/** Stepper ceiling for stackable add-ons the catalogue leaves uncapped. */
const UNCAPPED_STEPPER_MAX = 99;

/** Add-on code → quantity. Missing or 0 means not in the cart. */
export type AddOnSelection = Record<string, number>;

/** Add-ons the plan can take: the server rejects features the plan has and seats on unlimited plans. */
export function sellableAddOns(addOns: AddOnResponse[], plan: PlanResponse): AddOnResponse[] {
  const planFeatures = new Set(plan.features ?? []);
  return addOns.filter((addOn) => {
    if (
      addOn.grantType === 'FEATURE' &&
      addOn.grantsFeature &&
      planFeatures.has(addOn.grantsFeature)
    ) {
      return false;
    }
    if (addOn.grantType === 'SEATS' && plan.unlimited) return false;
    return true;
  });
}

export function maxQuantityFor(addOn: AddOnResponse): number {
  if (!addOn.stackable) return 1;
  return addOn.maxQuantity ?? UNCAPPED_STEPPER_MAX;
}

export function addOnPriceLabel(addOn: AddOnResponse): string {
  const price = formatRupees(addOn.price);
  return addOn.billingType === 'ANNUAL' ? `${price} / year` : `${price} one-time`;
}

/** Stable request (sorted, empty parts omitted) so equal carts share a quote cache entry. */
export function buildQuoteRequest(
  planCode: string,
  selection: AddOnSelection,
  voucherCodes: string[],
): QuoteRequest {
  const addOns = Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, quantity]) => ({ code, quantity }));
  const request: QuoteRequest = { planCode, durationMonths: 12 };
  if (addOns.length > 0) request.addOns = addOns;
  if (voucherCodes.length > 0) request.voucherCodes = [...voucherCodes].sort();
  return request;
}

/** Same rule as the server, so a code typed in lower case matches the applied list. */
export function normaliseVoucherCode(input: string): string {
  return input.trim().toUpperCase();
}

const VOUCHER_REJECTION_MESSAGES: Record<VoucherRejection, string> = {
  NOT_FOUND: 'This voucher code does not exist.',
  INACTIVE: 'This voucher is no longer active.',
  EXPIRED: 'This voucher has expired or is not valid yet.',
  EXHAUSTED: 'This voucher has been fully used.',
  WRONG_SHOP: 'This voucher was issued to a different shop.',
  NOT_APPLICABLE_TO_CART: 'This voucher does not apply to the selected plan.',
  ALREADY_REDEEMED: 'Your shop has already used this voucher.',
};

export function voucherRejectionMessage(reason: VoucherRejection | null | undefined): string {
  return reason ? VOUCHER_REJECTION_MESSAGES[reason] : 'This voucher cannot be applied.';
}

export interface VoucherDenial {
  voucherCode: string | null;
  message: string;
}

/** The voucher behind a VOUCHER_REJECTED error from quote or checkout, or null for any other error. */
export function readVoucherRejection(error: unknown): VoucherDenial | null {
  if (!isApiError(error) || error.code !== 'VOUCHER_REJECTED') return null;
  const details = (error.details ?? {}) as VoucherRejectedDetails;
  return {
    voucherCode: details.voucherCode ?? null,
    message: voucherRejectionMessage(details.reason),
  };
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
