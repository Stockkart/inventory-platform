import { isApiError } from '@inventory-platform/api-client';
import type {
  AddOnResponse,
  CreatePlanCheckoutRequest,
  PlanCheckoutResponse,
  QuoteAddOnLine,
  QuoteRequest,
  QuoteResponse,
  VoucherRejectedDetails,
  VoucherRejection,
} from '@inventory-platform/plan/types';
import { formatRupees } from '../ui/planPricing';

/** Stepper ceiling for stackable add-ons the catalogue leaves uncapped. */
const UNCAPPED_STEPPER_MAX = 99;

/** Add-on code → quantity. Missing or 0 means not in the cart. */
export type AddOnSelection = Record<string, number>;

/** Add-ons the API says this cart can take; `eligible` null (plain catalogue) counts as yes. */
export function eligibleAddOns(addOns: AddOnResponse[]): AddOnResponse[] {
  return addOns.filter((addOn) => addOn.eligible !== false);
}

export function maxQuantityFor(addOn: AddOnResponse): number {
  if (!addOn.stackable) return 1;
  return addOn.maxQuantity ?? UNCAPPED_STEPPER_MAX;
}

export function addOnPriceLabel(addOn: AddOnResponse): string {
  const price = formatRupees(addOn.price);
  return addOn.billingType === 'ANNUAL' ? `${price} / year` : `${price} one-time`;
}

function addOnLines(selection: AddOnSelection): QuoteAddOnLine[] {
  return Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, quantity]) => ({ code, quantity }));
}

function withExtras(
  request: QuoteRequest,
  voucherCodes: string[],
  applyWalletCredit: boolean,
): QuoteRequest {
  if (voucherCodes.length > 0) request.voucherCodes = [...voucherCodes].sort();
  if (applyWalletCredit) request.applyWalletCredit = true;
  return request;
}

/** Stable request (sorted, empty parts omitted) so equal carts share a quote cache entry. */
export function buildQuoteRequest(
  planCode: string,
  selection: AddOnSelection,
  voucherCodes: string[],
  applyWalletCredit = false,
): QuoteRequest {
  const addOns = addOnLines(selection);
  const request: QuoteRequest = { planCode, durationMonths: 12 };
  if (addOns.length > 0) request.addOns = addOns;
  return withExtras(request, voucherCodes, applyWalletCredit);
}

/**
 * Add-on-only cart: no plan code, priced by the server against the shop's current paid plan.
 * Null when nothing is selected, since the server needs at least one add-on.
 */
export function buildAddOnOnlyRequest(
  selection: AddOnSelection,
  voucherCodes: string[],
  applyWalletCredit = false,
): QuoteRequest | null {
  const addOns = addOnLines(selection);
  if (addOns.length === 0) return null;
  return withExtras({ addOns }, voucherCodes, applyWalletCredit);
}

/** The wallet covered the whole order: the server paid and fulfilled it, no gateway to open. */
export function paidFromWallet(checkout: PlanCheckoutResponse): boolean {
  return checkout.provider === 'wallet';
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

/**
 * Vouchers left applied after a VOUCHER_REJECTED: drop the named one, or all of them when the API
 * does not say which, so the cart can be priced again instead of staying stuck.
 */
export function vouchersAfterRejection(codes: string[], rejection: VoucherDenial): string[] {
  if (!rejection.voucherCode) return [];
  return codes.filter((code) => code !== rejection.voucherCode);
}

/**
 * Why the quote failed, for the Retry alert, or null when the voucher field already says it.
 * A rejected voucher that is not in the applied list (nothing left to drop) would otherwise leave
 * the cart unpriced with no message, so it counts as a quote failure too.
 */
export function quoteFailureMessage(error: unknown, appliedVouchers: string[]): string | null {
  if (!error) return null;
  const rejection = readVoucherRejection(error);
  if (rejection) {
    const remaining = vouchersAfterRejection(appliedVouchers, rejection);
    return remaining.length === appliedVouchers.length ? rejection.message : null;
  }
  return error instanceof Error ? error.message : 'Could not price this order';
}

/**
 * What one idempotency key stands for: the cart plus the totals the shopper was shown. The server
 * replays an order for a reused key, so a new total (a voucher ran out, wallet credit moved) must
 * get a new key or the shopper pays the old amount.
 */
export function checkoutFingerprint(
  request: CreatePlanCheckoutRequest,
  quote: Pick<QuoteResponse, 'grandTotal' | 'walletCredit'> | undefined,
): string {
  return JSON.stringify({
    request,
    grandTotal: quote?.grandTotal ?? null,
    walletCredit: quote?.walletCredit ?? null,
  });
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
