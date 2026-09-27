import type { BadgeVariant } from '@inventory-platform/ui-kit';
import type {
  ReferralAttributionStatus,
  ReferralRewardStatus,
  WalletEntrySource,
} from '@inventory-platform/plan/types';

/** Link a referrer shares; onboarding prefills the code from `?ref=`. */
export function referralShareLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/onboarding?ref=${encodeURIComponent(code)}`;
}

const REWARD_STATUS: Record<ReferralRewardStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'On hold', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'info' },
  CREDITING: { label: 'Crediting', variant: 'info' },
  CREDITED: { label: 'Credited', variant: 'success' },
  VOID: { label: 'Not eligible', variant: 'neutral' },
  CLAWED_BACK: { label: 'Reversed', variant: 'danger' },
};

export function rewardStatusBadge(status: ReferralRewardStatus) {
  return REWARD_STATUS[status];
}

const WALLET_SOURCE_LABELS: Record<WalletEntrySource, string> = {
  REFERRAL_REWARD: 'Referral reward',
  ORDER_RESERVATION: 'Held for checkout',
  RESERVATION_RELEASE: 'Checkout hold released',
  ORDER_REDEMPTION: 'Spent on a plan',
  MANUAL_ADJUSTMENT: 'Adjustment',
  CLAWBACK: 'Referral reversed',
};

export function walletSourceLabel(source: WalletEntrySource): string {
  return WALLET_SOURCE_LABELS[source];
}

/** Only statuses a shop owner can act on or should know about; RESOLVED needs no message. */
export function referredByMessage(status: ReferralAttributionStatus | null): string | null {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Your referral is being reviewed by our team.';
    case 'SELF_REFERRAL':
    case 'DUPLICATE':
    case 'REJECTED':
      return 'The referral you entered at sign-up was not accepted.';
    default:
      return null;
  }
}
