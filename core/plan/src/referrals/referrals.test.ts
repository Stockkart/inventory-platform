import { describe, expect, it } from 'vitest';
import {
  referralShareLink,
  referredByMessage,
  rewardStatusBadge,
  walletSourceLabel,
} from './referrals';

describe('referralShareLink', () => {
  it('points at onboarding with the code', () => {
    expect(referralShareLink('https://app.stockkart.in/', 'SK-AB2CD3')).toBe(
      'https://app.stockkart.in/onboarding?ref=SK-AB2CD3',
    );
  });
});

describe('labels', () => {
  it('describes held and reversed rewards', () => {
    expect(rewardStatusBadge('PENDING')).toEqual({ label: 'On hold', variant: 'warning' });
    expect(rewardStatusBadge('CLAWED_BACK').variant).toBe('danger');
  });

  it('names wallet movements', () => {
    expect(walletSourceLabel('ORDER_REDEMPTION')).toBe('Spent on a plan');
  });

  it('only explains referrals that are not simply resolved', () => {
    expect(referredByMessage('RESOLVED')).toBeNull();
    expect(referredByMessage(null)).toBeNull();
    expect(referredByMessage('PENDING_REVIEW')).toMatch(/reviewed/);
    expect(referredByMessage('REJECTED')).toMatch(/not accepted/);
  });
});
