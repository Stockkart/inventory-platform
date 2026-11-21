import type { BadgeVariant } from '@inventory-platform/ui-kit';
import type {
  ReferralAttributionStatus,
  ReferralRewardStatus,
  WalletEntrySource,
} from '@inventory-platform/plan/types';

/**
 * Link a referrer shares. It opens sign-up, which keeps `?ref=` for the onboarding referral step
 * (`core/user` `rememberReferralCode`); onboarding itself is behind sign-in.
 */
export function referralShareLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/signup?ref=${encodeURIComponent(code)}`;
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
  // The shop wallet API leaves out a paid order's ORDER_REDEMPTION row (it moves no available
  // credit), so this row is where the shop sees the credit go; a release row follows if unpaid.
  ORDER_RESERVATION: 'Used at checkout',
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
