import { createQueryKeyFactory } from '@inventory-platform/query';
import type { QuoteRequest } from '@inventory-platform/plan/types';

const base = createQueryKeyFactory('plan');

export const planKeys = {
  ...base,
  list: () => [...base.all, 'list'] as const,
  detail: (planId: string) => [...base.all, 'detail', planId] as const,
  shopStatus: () => [...base.all, 'shop-status'] as const,
  transactions: () => [...base.all, 'transactions'] as const,
  usage: () => [...base.all, 'usage'] as const,
  /** Per shop, so a shop switch or a login as another shop never reads the previous shop's cache. */
  shopEntitlements: (shopId: string) => [...base.all, 'shop-entitlements', shopId] as const,
  /** Prefix of every cart quote. */
  quotes: () => [...base.all, 'quote'] as const,
  quote: (request: QuoteRequest) => [...base.all, 'quote', request] as const,
  activeCampaign: () => [...base.all, 'active-campaign'] as const,
  addOns: (planCode?: string | null) => [...base.all, 'addons', planCode ?? 'all'] as const,
  addOnOptions: () => [...base.all, 'addon-options'] as const,
  wallet: () => [...base.all, 'wallet'] as const,
  referralSummary: () => [...base.all, 'referral-summary'] as const,
  referralRewards: () => [...base.all, 'referral-rewards'] as const,
};

/**
 * Every plan query except cart quotes. After a payment the page leaves; re-pricing the cart it just
 * paid for is wasted work and can flash a voucher error (a single-use voucher is now redeemed).
 */
export function isPlanDataExceptQuote(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === planKeys.all[0] && query.queryKey[1] !== planKeys.quotes()[1];
}

export const PLAN_MODULE_VERSION = '0.1.0';
