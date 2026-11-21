import type { AddOnResponse, ShopPlanStatusResponse } from '@inventory-platform/plan/types';
import { isPlanFeature } from '../entitlements/entitlements';
import { FEATURE_LABELS } from '../ui/planPricing';
import { eligibleAddOns, maxQuantityFor, type AddOnSelection } from './cart';

export const PLAN_STATUS_PATH = '/dashboard/plan-status';
export const PLAN_PAYMENT_PATH = '/dashboard/plan-payment';

type TopUpStatus = Pick<ShopPlanStatusResponse, 'canBuyAddOnsAlone'>;

/** The API says whether the shop can buy add-ons on their own (an active paid plan). */
export function canBuyAddOnsAlone(status: TopUpStatus): boolean {
  return status.canBuyAddOnsAlone === true;
}

/** Top-ups to offer: the API's add-on options for this shop that it marks eligible. */
export function topUpAddOns(options: AddOnResponse[], status: TopUpStatus): AddOnResponse[] {
  return canBuyAddOnsAlone(status) ? eligibleAddOns(options) : [];
}

/** StockKart does not send SMS yet; the API rejects SMS packs, so they show as coming soon. */
export function isComingSoonAddOn(addOn: AddOnResponse): boolean {
  return addOn.grantType === 'SMS';
}

/** What one unit of the add-on gives, from the catalogue fields; null when the catalogue says nothing. */
export function addOnGrantLabel(addOn: AddOnResponse): string | null {
  const quantity = addOn.grantsQuantity;
  switch (addOn.grantType) {
    case 'FEATURE':
      if (!addOn.grantsFeature) return null;
      // A feature this build has no label for yet: name the add-on rather than print "undefined".
      return `Unlocks ${
        isPlanFeature(addOn.grantsFeature) ? FEATURE_LABELS[addOn.grantsFeature] : addOn.name
      }`;
    case 'SEATS': {
      const seats = quantity ?? 1;
      return `+${seats} user${seats === 1 ? '' : 's'}`;
    }
    case 'OCR_CREDITS':
      return quantity != null ? `${quantity.toLocaleString('en-IN')} OCR credits` : 'OCR credits';
    case 'SMS':
      return quantity != null ? `${quantity.toLocaleString('en-IN')} SMS` : 'SMS pack';
    default:
      return null;
  }
}

/** One add-on bought on its own, as carried in the payment page URL. */
export interface AddOnOnlyIntent {
  code: string;
  quantity: number;
}

/** Payment page link for an add-on-only order (no planId). */
export function addOnOnlyPaymentPath({ code, quantity }: AddOnOnlyIntent): string {
  const params = new URLSearchParams({ addOn: code, qty: String(quantity) });
  return `${PLAN_PAYMENT_PATH}?${params.toString()}`;
}

/** `?addOn=CODE&qty=N` without a planId; a bad or missing qty reads as 1 (the API checks the cap). */
export function readAddOnOnlyIntent(params: URLSearchParams): AddOnOnlyIntent | null {
  if (params.get('planId')) return null;
  const code = params.get('addOn')?.trim();
  if (!code) return null;
  const quantity = Number.parseInt(params.get('qty') ?? '', 10);
  return { code, quantity: Number.isInteger(quantity) && quantity >= 1 ? quantity : 1 };
}

/** What the payment page can do with an add-on-only link once plan status and catalogue are in. */
export type AddOnOnlyIntentState =
  | { kind: 'loading' }
  /** Trial, expired or no plan: the API sells add-ons on their own only on an active paid plan. */
  | { kind: 'planNotEligible' }
  /** Not a top-up this plan can take (already included, unknown code) or coming soon. */
  | { kind: 'unavailable' }
  | { kind: 'ready'; selection: AddOnSelection };

/**
 * Checks a `?addOn=CODE&qty=N` link against the shop's plan and the catalogue before it reaches the
 * cart, so a code the picker would hide never gets stuck in an order the API rejects. The quantity
 * is held to the stepper bounds; the API still validates it.
 */
export function resolveAddOnOnlyIntent(
  intent: AddOnOnlyIntent,
  catalogue: AddOnResponse[] | undefined,
  status: TopUpStatus | undefined,
): AddOnOnlyIntentState {
  if (!status) return { kind: 'loading' };
  if (!canBuyAddOnsAlone(status)) return { kind: 'planNotEligible' };
  if (!catalogue) return { kind: 'loading' };
  const addOn = topUpAddOns(catalogue, status).find((candidate) => candidate.code === intent.code);
  if (!addOn || isComingSoonAddOn(addOn)) return { kind: 'unavailable' };
  const quantity = Math.min(Math.max(1, intent.quantity), maxQuantityFor(addOn));
  return { kind: 'ready', selection: { [addOn.code]: quantity } };
}

/** "31 Mar 2027": the Indian calendar day an add-on term ends; null when absent or unreadable. */
export function formatTermEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
