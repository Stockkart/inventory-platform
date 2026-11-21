import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  PlanMisParams,
  QuoteRequest,
  VoucherListFilters,
} from '@inventory-platform/plan/types';

const base = createQueryKeyFactory('plan');

export const planKeys = {
  ...base,
  list: () => [...base.all, 'list'] as const,
  detail: (planId: string) => [...base.all, 'detail', planId] as const,
  shopStatus: () => [...base.all, 'shop-status'] as const,
  transactions: () => [...base.all, 'transactions'] as const,
  usage: () => [...base.all, 'usage'] as const,
  /** Prefix of every cart quote. */
  quotes: () => [...base.all, 'quote'] as const,
  quote: (request: QuoteRequest) => [...base.all, 'quote', request] as const,
  activeCampaign: () => [...base.all, 'active-campaign'] as const,
  addOns: () => [...base.all, 'addons'] as const,
  wallet: () => [...base.all, 'wallet'] as const,
  referralSummary: () => [...base.all, 'referral-summary'] as const,
  referralRewards: () => [...base.all, 'referral-rewards'] as const,
  adminMis: (params: PlanMisParams) => [...base.all, 'admin-mis', params] as const,
  adminReferrals: () => [...base.all, 'admin-referrals'] as const,
  adminAttributions: (status: string) =>
    [...base.all, 'admin-referrals', 'attributions', status] as const,
  adminRewards: (status: string | null) =>
    [...base.all, 'admin-referrals', 'rewards', status ?? 'all'] as const,
  adminWallet: (shopId: string) => [...base.all, 'admin-wallet', shopId] as const,
  adminAddOns: () => [...base.all, 'admin-addons'] as const,
  adminPlans: () => [...base.all, 'admin-plans'] as const,
  adminShopAddOns: (shopId: string) => [...base.all, 'admin-shop-addons', shopId] as const,
  adminCampaigns: () => [...base.all, 'admin-campaigns'] as const,
  adminVouchers: () => [...base.all, 'admin-vouchers'] as const,
  adminVoucherList: (filters: VoucherListFilters) =>
    [
      ...base.all,
      'admin-vouchers',
      'list',
      filters.addOnCode ?? 'all',
      filters.planCode ?? 'all',
      filters.target ?? 'all',
    ] as const,
  adminVoucherPlanPreview: (planCode: string, type: string, value: number | null) =>
    [...base.all, 'admin-vouchers', 'plan-preview', planCode, type, value] as const,
  adminVoucherRedemptions: (id: string) =>
    [...base.all, 'admin-vouchers', 'redemptions', id] as const,
  adminWalletPreview: (shopId: string, amount: number) =>
    [...base.all, 'admin-wallet', shopId, 'preview', amount] as const,
};

/**
 * Every plan query except cart quotes. After a payment the page leaves; re-pricing the cart it just
 * paid for is wasted work and can flash a voucher error (a single-use voucher is now redeemed).
 */
export function isPlanDataExceptQuote(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === planKeys.all[0] && query.queryKey[1] !== planKeys.quotes()[1];
}

export const PLAN_MODULE_VERSION = '0.1.0';
