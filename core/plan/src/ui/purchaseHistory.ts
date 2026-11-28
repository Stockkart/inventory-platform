import type { QuoteResponse } from '@inventory-platform/plan/types';
import type { PlanTransactionResponse, PurchaseLine } from '../model/types';
import { formatPlanDate } from './planDate';
import { formatRupees } from './planPricing';

/** Labels for the Past purchases list. Formatting only: every figure comes from the API. */

/** "12 Nov 2026" */
export function purchaseDateLabel(iso: string | null): string {
  return formatPlanDate(iso) ?? '';
}

function durationLabel(months: number | null): string | null {
  if (months == null || months <= 0) return null;
  if (months === 12) return '1 year';
  return months === 1 ? '1 month' : `${months} months`;
}

/** "Starter · 1 year", "Add-ons: SMS pack ×1" or "Starter · assigned". */
export function purchaseTitle(tx: PlanTransactionResponse): string {
  if (tx.kind === 'ADD_ON_ONLY') {
    const names = (tx.items ?? [])
      .filter((line) => line.type !== 'PLAN')
      .map((line) => `${line.name} ×${line.quantity}`);
    return names.length > 0 ? `Add-ons: ${names.join(', ')}` : 'Add-ons';
  }
  if (tx.kind === 'ASSIGNED') return `${tx.planName} · assigned`;
  const duration = durationLabel(tx.durationMonths);
  return duration ? `${tx.planName} · ${duration}` : tx.planName;
}

/** "12 Nov 2026 – 12 Nov 2027", "≈ " prefixed when estimated; "" when there is no term. */
export function periodLabel(tx: PlanTransactionResponse): string {
  const start = formatPlanDate(tx.termStartsAt);
  const end = formatPlanDate(tx.termEndsAt);
  if (!end) return '';
  const range = start ? `${start} – ${end}` : `Until ${end}`;
  return tx.termEstimated ? `≈ ${range}` : range;
}

/** "Refunded ₹4,999 to UPI · ₹2,000 to wallet"; "" when nothing was refunded. */
export function refundLabel(tx: PlanTransactionResponse): string {
  const parts: string[] = [];
  if (tx.refundedToPaymentMethod != null) {
    const amount = formatRupees(tx.refundedToPaymentMethod);
    parts.push(tx.paymentMethod ? `${amount} to ${tx.paymentMethod}` : amount);
  }
  if (tx.walletCreditReturned != null) {
    parts.push(`${formatRupees(tx.walletCreditReturned)} to wallet`);
  }
  if (parts.length > 0) return `Refunded ${parts.join(' · ')}`;
  return tx.status === 'REFUNDED' ? 'Refunded' : '';
}

/** Whether the row has anything to show when expanded. */
export function hasPurchaseDetail(tx: PlanTransactionResponse): boolean {
  return (
    tx.amount != null ||
    (tx.items?.length ?? 0) > 0 ||
    tx.subtotal != null ||
    tx.discountTotal != null ||
    tx.walletCredit != null
  );
}

/** "Paid · UPI" / "Paid" (method unknown). */
export function paidLabel(tx: PlanTransactionResponse): string {
  return tx.paymentMethod ? `Paid · ${tx.paymentMethod}` : 'Paid';
}

/** "₹999 each" for a line bought in quantity; "" otherwise. */
export function lineEachLabel(line: PurchaseLine): string {
  return line.quantity > 1 && line.unitPrice != null ? `${formatRupees(line.unitPrice)} each` : '';
}

/**
 * Text under an applied plan voucher: the discount is the quote line's own figure, never computed.
 */
export function planVoucherText(
  code: string,
  planName: string,
  quote: QuoteResponse | undefined,
): string {
  const discount = quote?.items.find(
    (item) => item.voucherCode === code && item.discount > 0,
  )?.discount;
  return discount != null ? `${formatRupees(discount)} off ${planName}` : `Applies to ${planName}`;
}

/**
 * The full price of the purchase, wallet part included (API `totalAmount`; `amount` from an older
 * API); a dash when the API hides it (assigned plans have no verified charge).
 */
export function amountLabel(tx: PlanTransactionResponse): string {
  const total = tx.totalAmount ?? tx.amount;
  return total == null ? '—' : formatRupees(total);
}

/** What Razorpay charged, for the "Paid" row of the breakdown; a dash when hidden. */
export function gatewayAmountLabel(tx: PlanTransactionResponse): string {
  const paid = tx.gatewayAmount ?? tx.amount;
  return paid == null ? '—' : formatRupees(paid);
}

/**
 * How the total was paid, from the API's parts: "₹300.00 wallet + ₹200.00 Razorpay", or
 * "Paid from wallet" when Razorpay took nothing; "" when the wallet was not used.
 */
export function paymentSplitLabel(tx: PlanTransactionResponse): string {
  if (tx.walletAmount == null || tx.walletAmount <= 0) return '';
  if (tx.gatewayAmount == null || tx.gatewayAmount <= 0) return 'Paid from wallet';
  return `${formatRupees(tx.walletAmount)} wallet + ${formatRupees(tx.gatewayAmount)} Razorpay`;
}

/** Plain-words tag for an order that is not finished; null for finished or order-less rows. */
export function statusTagLabel(tx: PlanTransactionResponse): string | null {
  switch (tx.status) {
    case 'PAID':
    case 'FULFILLING':
      return 'Processing';
    case 'FULFILMENT_FAILED':
      return 'Needs attention';
    default:
      return null;
  }
}
