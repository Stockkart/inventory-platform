import { describe, expect, it } from 'vitest';
import { attributionStatusBadge, parseAdjustmentAmount, reviewReasonLabel } from './format';
import { rewardActions } from './referrals/RewardsPanel';

describe('parseAdjustmentAmount', () => {
  it('accepts signed rupee amounts', () => {
    expect(parseAdjustmentAmount('250')).toBe(250);
    expect(parseAdjustmentAmount(' -99.50 ')).toBe(-99.5);
    expect(parseAdjustmentAmount('+10')).toBe(10);
  });

  it('rejects zero, junk and sub-paise amounts', () => {
    expect(parseAdjustmentAmount('0')).toBeNull();
    expect(parseAdjustmentAmount('-0.00')).toBeNull();
    expect(parseAdjustmentAmount('ten')).toBeNull();
    expect(parseAdjustmentAmount('1.005')).toBeNull();
    expect(parseAdjustmentAmount('')).toBeNull();
  });
});

describe('rewardActions', () => {
  it('offers only what the reward state allows', () => {
    expect(rewardActions('PENDING')).toEqual(['approve', 'void']);
    expect(rewardActions('APPROVED')).toEqual(['void']);
    expect(rewardActions('CREDITED')).toEqual(['clawback']);
    expect(rewardActions('CREDITING')).toEqual([]);
    expect(rewardActions('CLAWED_BACK')).toEqual([]);
  });
});

describe('labels', () => {
  it('explains why a referral needs review', () => {
    expect(reviewReasonLabel('NAME_ONLY')).toBe('Only a name was given');
    expect(reviewReasonLabel(null)).toBe('—');
    expect(attributionStatusBadge('PENDING_REVIEW').variant).toBe('warning');
  });
});
