import type { AddOnResponse, ShopPlanStatusResponse } from '@inventory-platform/plan/types';
import { FEATURE_LABELS } from '../ui/planPricing';
import { sellableAddOns } from './cart';

export const PLAN_STATUS_PATH = '/dashboard/plan-status';
export const PLAN_PAYMENT_PATH = '/dashboard/plan-payment';

type TopUpStatus = Pick<ShopPlanStatusResponse, 'trial' | 'planExpired' | 'plan'>;

/** The API sells add-ons on their own only on an active paid plan, never on a trial or expired plan. */
export function canBuyAddOnsAlone(status: TopUpStatus): boolean {
  return !status.trial && !status.planExpired && status.plan != null;
}

/** Add-ons the current plan can take: drops features it already includes and seats on unlimited plans. */
export function topUpAddOns(addOns: AddOnResponse[], status: TopUpStatus): AddOnResponse[] {
  if (!canBuyAddOnsAlone(status) || !status.plan) return [];
  return sellableAddOns(addOns, status.plan);
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
      return addOn.grantsFeature ? `Unlocks ${FEATURE_LABELS[addOn.grantsFeature]}` : null;
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
