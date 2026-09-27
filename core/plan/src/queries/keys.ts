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
  quote: (request: QuoteRequest) => [...base.all, 'quote', request] as const,
  activeCampaign: () => [...base.all, 'active-campaign'] as const,
  addOns: () => [...base.all, 'addons'] as const,
  wallet: () => [...base.all, 'wallet'] as const,
  referralSummary: () => [...base.all, 'referral-summary'] as const,
  referralRewards: () => [...base.all, 'referral-rewards'] as const,
};

export const PLAN_MODULE_VERSION = '0.1.0';
